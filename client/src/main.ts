/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LanguageClientOptions, RevealOutputChannelOn } from 'vscode-languageclient';
import { LanguageClient, TranferableMessage } from './browserClient';
import { SupportedLanguages } from './supportedLanguages';

export function activate(context: vscode.ExtensionContext) {

	const supportedLanguages = new SupportedLanguages(context);
	let serverHandle = startServer(context.extensionUri, supportedLanguages);
	context.subscriptions.push(supportedLanguages);
	context.subscriptions.push(supportedLanguages.onDidChange(() => {
		// restart server when supported languages change
		serverHandle.then(handle => handle.dispose());
		serverHandle = startServer(context.extensionUri, supportedLanguages);
	}));
	context.subscriptions.push(new vscode.Disposable(() => {
		// stop server on deactivate
		serverHandle.then(handle => handle.dispose());
	}));

	// -- status (NEW proposal)
	const item = vscode.languages.createLanguageStatusItem('info', supportedLanguages.getSupportedLanguagesAsSelector());
	context.subscriptions.push(item);
	item.text = `$(regex)`;
	let tooltip: string;
	if (vscode.extensions.getExtension('github.remotehub-insiders')) {
		tooltip = 'anycode offers basic language support for this file, you can [continue working on](command:remoteHub.continueOn \'Continue working on this remote repository elsewhere\') this file elsewhere.';
	} else {
		tooltip = 'anycode offers basic language support for this file.';
	}
	item.detail = tooltip;
}

async function startServer(extensionUri: vscode.Uri, supportedLanguages: SupportedLanguages): Promise<vscode.Disposable> {

	const disposables: vscode.Disposable[] = [];

	const clientOptions: LanguageClientOptions = {
		revealOutputChannelOn: RevealOutputChannelOn.Never,
		documentSelector: supportedLanguages.getSupportedLanguagesAsSelector(),
		synchronize: {},
		initializationOptions: {
			treeSitterWasmUri: vscode.Uri.joinPath(extensionUri, './server/tree-sitter/tree-sitter.wasm').toString(),
			supportedLanguages: supportedLanguages.getSupportedLanguages()
		},
	};

	const serverMain = vscode.Uri.joinPath(extensionUri, 'dist/anycode.server.js');
	const worker = new Worker(serverMain.toString());
	const client = new LanguageClient('anycode', 'anycode', clientOptions, worker);

	disposables.push(client.start());
	disposables.push(new vscode.Disposable(() => worker.terminate()));

	await client.onReady();

	// Build a glob-patterns for languages which have features enables, like workspace symbol search, 
	// and use this pattern for initial file discovery and file watching
	const findAndSearchSuffixes: string[][] = [];
	for (let [info, config] of supportedLanguages.getSupportedLanguages()) {
		if (config.workspaceSymbols || config.references || config.definitions) {
			findAndSearchSuffixes.push(info.suffixes);
		}
	}
	const langPattern = `**/*.{${findAndSearchSuffixes.join(',')}}`;
	const watcher = vscode.workspace.createFileSystemWatcher(langPattern);
	disposables.push(watcher);

	// file discover and watching. in addition to text documents we annouce and provide
	// all matching files
	const size = Math.max(0, vscode.workspace.getConfiguration('anycode').get<number>('symbolIndexSize', 500));

	// https://github.com/microsoft/vscode/issues/48674
	const exclude = `{${[
		...Object.keys(vscode.workspace.getConfiguration('search', null).get('exclude') ?? {}),
		...Object.keys(vscode.workspace.getConfiguration('files', null).get('exclude') ?? {})
	].join(',')}}`;

	const init = Promise.resolve(vscode.workspace.findFiles(langPattern, exclude, 0).then(uris => {
		const p = new Promise(resolve => disposables.push(new vscode.Disposable(resolve))); // stop on server-end

		uris = uris.slice(0, size); // https://github.com/microsoft/vscode-remotehub/issues/255
		console.info(`FOUND ${uris.length} files for ${langPattern}`);
		return Promise.race([p, client.sendRequest('queue/init', uris.map(String))]);
	}));
	vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Building Index...' }, () => init);
	disposables.push(watcher.onDidCreate(uri => {
		client.sendNotification('queue/add', [uri.toString()]);
	}));
	disposables.push(watcher.onDidDelete(uri => {
		client.sendNotification('queue/remove', [uri.toString()]);
		client.sendNotification('file-cache/remove', uri.toString());
	}));
	disposables.push(watcher.onDidChange(uri => {
		client.sendNotification('queue/add', [uri.toString()]);
		client.sendNotification('file-cache/remove', uri.toString());
	}));

	// serve fileRead request		
	client.onRequest('file/read', async raw => {
		const uri = vscode.Uri.parse(raw);
		let languageId = '';
		for (let [item] of supportedLanguages.getSupportedLanguages()) {
			if (item.suffixes.some(suffix => uri.path.endsWith(`.${suffix}`))) {
				languageId = item.languageId;
				break;
			}
		}
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.size > 1024 ** 2) {
			console.warn(`IGNORING "${uri.toString()}" because it is too large (${stat.size}bytes)`);
			return { data: new Uint8Array(), languageId };
		}
		const data = await vscode.workspace.fs.readFile(uri);
		return new TranferableMessage({ buffer: data, languageId }, [data.buffer]);
	});

	return vscode.Disposable.from(...disposables);
}
