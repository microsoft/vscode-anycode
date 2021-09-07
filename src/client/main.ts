/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LanguageClientOptions } from 'vscode-languageclient';
import { LanguageClient } from 'vscode-languageclient/browser';
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
	item.text = `anycode`;
	let tooltip: string;
	if (vscode.extensions.getExtension('github.remotehub-insiders')) {
		tooltip = 'Only basic language support can be offered for this file. For better language support you can [continue working on](command:remoteHub.continueOn \'Continue working on this remote repository elsewhere\') this file elsewhere.';
	} else {
		tooltip = 'Only basic language support can be offered for this file.';
	}
	item.detail = tooltip;
}

async function startServer(extensionUri: vscode.Uri, supportedLanguages: SupportedLanguages): Promise<vscode.Disposable> {

	const disposables: vscode.Disposable[] = [];

	const clientOptions: LanguageClientOptions = {
		documentSelector: supportedLanguages.getSupportedLanguagesAsSelector(),
		synchronize: {},
		initializationOptions: {
			// todo@jrieken same, same but different bug
			treeSitterWasmUri: vscode.Uri.joinPath(extensionUri, 'tree-sitter/tree-sitter.wasm').toString().replace(/^file:\/\//, 'vscode-file://vscode-app'),
			supportedLanguages: supportedLanguages.getSupportedLanguages()
		}
	};

	const serverMain = vscode.Uri.joinPath(extensionUri, 'dist/anycode.server.js');
	const worker = new Worker(serverMain.toString());
	const client = new LanguageClient('anycode', 'anycode', clientOptions, worker);

	disposables.push(client.start());
	disposables.push(new vscode.Disposable(() => worker.terminate()));

	await client.onReady();

	const langPattern = `**/*.{${supportedLanguages.getSupportedLanguages().map(item => item.suffixes).flat().join(',')}}`;
	const watcher = vscode.workspace.createFileSystemWatcher(langPattern);
	disposables.push(watcher);

	// file discover and watching. in addition to text documents we annouce and provide
	// all matching files
	const size = Math.max(0, vscode.workspace.getConfiguration('anycode').get<number>('symbolIndexSize', 500));
	const init = Promise.resolve(vscode.workspace.findFiles(langPattern, undefined, 0).then(uris => {
		uris = uris.slice(0, size); // https://github.com/microsoft/vscode-remotehub/issues/255
		console.info(`FOUND ${uris.length} files for ${langPattern}`);
		return client.sendRequest('queue/init', uris.map(String));
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
		for (let item of supportedLanguages.getSupportedLanguages()) {
			if (item.suffixes.some(suffix => uri.path.endsWith(`.${suffix}`))) {
				languageId = item.languageId;
				break;
			}
		}
		const data = await vscode.workspace.fs.readFile(uri);
		return { data, languageId };
	});

	return vscode.Disposable.from(...disposables);
}
