/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { LanguageClientOptions, RevealOutputChannelOn } from 'vscode-languageclient';
import { LanguageClient } from 'vscode-languageclient/browser';
import { SupportedLanguages } from './supportedLanguages';
import TelemetryReporter from 'vscode-extension-telemetry';

export function activate(context: vscode.ExtensionContext) {

	const telemetry = new TelemetryReporter(context.extension.id, context.extension.packageJSON['version'], context.extension.packageJSON['aiKey']);
	const supportedLanguages = new SupportedLanguages(context);

	let serverHandles: Promise<vscode.Disposable>[] = [];
	startServer();

	function startServer() {
		serverHandles.push(
			_startServer(context.extensionUri, supportedLanguages, telemetry),
			_showStatusAndInfo(context, supportedLanguages)
		);
	}

	async function stopServers() {
		const oldHandles = serverHandles.slice(0);
		serverHandles = [];
		const result = await Promise.allSettled(oldHandles);
		for (const item of result) {
			if (item.status === 'fulfilled') {
				item.value.dispose();
			}
		}
	}

	context.subscriptions.push(supportedLanguages);
	context.subscriptions.push(supportedLanguages.onDidChange(() => {
		// restart server when supported languages change
		stopServers();
		startServer();
	}));

	// stop server on deactivate
	context.subscriptions.push(new vscode.Disposable(stopServers));
}

async function _showStatusAndInfo(context: vscode.ExtensionContext, supportedLanguages: SupportedLanguages): Promise<vscode.Disposable> {

	const disposables: vscode.Disposable[] = [];

	const _mementoKey = 'didShowMessage';
	const didShowExplainer = context.globalState.get(_mementoKey, false);

	disposables.push(vscode.commands.registerCommand('anycode.resetDidShowMessage', () => context.globalState.update(_mementoKey, false)));

	// --- language status item

	const statusItem = vscode.languages.createLanguageStatusItem('info', supportedLanguages.getSupportedLanguagesAsSelector());
	disposables.push(statusItem);
	statusItem.severity = vscode.LanguageStatusSeverity.Warning;
	statusItem.text = `Partial Mode`;
	statusItem.detail = 'Language support for this file is inaccurate.';
	statusItem.command = {
		title: 'Learn More',
		command: 'vscode.open',
		arguments: [
			vscode.Uri.parse('https://aka.ms/vscode-anycode'),
		]
	};


	// --- notifications message on interaction

	if (!didShowExplainer) {

		async function showMessage() {
			await vscode.window.showInformationMessage('Language support is inaccurate in this context, results may be imprecise and incomplete.');
		};

		const provideFyi = async () => {
			registrations.dispose();
			context.globalState.update(_mementoKey, true);
			context.globalState.setKeysForSync([_mementoKey]);
			showMessage();
			return undefined;
		};
		const selector = supportedLanguages.getSupportedLanguagesAsSelector();
		const registrations = vscode.Disposable.from(
			// vscode.languages.registerCompletionItemProvider(selector, { provideCompletionItems: provideFyi }),
			// vscode.languages.registerDocumentSymbolProvider(selector, { provideDocumentSymbols: provideFyi }),
			vscode.languages.registerDefinitionProvider(selector, { provideDefinition: provideFyi }),
			vscode.languages.registerReferenceProvider(selector, { provideReferences: provideFyi }),
			// vscode.languages.registerWorkspaceSymbolProvider({ provideWorkspaceSymbols: provideFyi }),
		);
		disposables.push(registrations);
	}

	return vscode.Disposable.from(...disposables);
}

async function _startServer(extensionUri: vscode.Uri, supportedLanguages: SupportedLanguages, telemetry: TelemetryReporter): Promise<vscode.Disposable> {

	const disposables: vscode.Disposable[] = [];

	function _sendFeatureTelementry(name: string, language: string) {
		/* __GDPR__
			"feature" : {
				"name" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"language" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
			}
		*/
		telemetry.sendTelemetryEvent('feature', { name, language });
	}

	const clientOptions: LanguageClientOptions = {
		outputChannelName: 'anycode',
		revealOutputChannelOn: RevealOutputChannelOn.Never,
		documentSelector: supportedLanguages.getSupportedLanguagesAsSelector(),
		synchronize: {},
		initializationOptions: {
			treeSitterWasmUri: vscode.Uri.joinPath(extensionUri, './server/tree-sitter/tree-sitter.wasm').toString(),
			supportedLanguages: supportedLanguages.getSupportedLanguages()
		},
		middleware: {
			provideWorkspaceSymbols(query, token, next) {
				_sendFeatureTelementry('workspaceSymbols', '');
				return next(query, token);
			},
			provideDefinition(document, position, token, next) {
				_sendFeatureTelementry('definition', document.languageId);
				return next(document, position, token);
			},
			provideReferences(document, position, options, token, next) {
				_sendFeatureTelementry('references', document.languageId);
				return next(document, position, options, token);
			},
			provideDocumentHighlights(document, position, token, next) {
				_sendFeatureTelementry('documentHighlights', document.languageId);
				return next(document, position, token);
			}
		}
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

	// workaround for https://github.com/microsoft/vscode/issues/48674
	const exclude = `{${[
		...Object.keys(vscode.workspace.getConfiguration('search', null).get('exclude') ?? {}),
		...Object.keys(vscode.workspace.getConfiguration('files', null).get('exclude') ?? {})
	].join(',')}}`;

	const size = Math.max(0, vscode.workspace.getConfiguration('anycode').get<number>('symbolIndexSize', 100));
	const init = Promise.resolve(vscode.workspace.findFiles(langPattern, exclude, size + 1).then(async uris => {
		console.info(`FOUND ${uris.length} files for ${langPattern}`);

		const t1 = performance.now();
		await client.sendRequest('queue/init', uris.map(String));
		/* __GDPR__
			"init" : {
				"numOfFiles" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"indexSize" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"duration" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
			}
		*/
		telemetry.sendTelemetryEvent('init', undefined, { numOfFiles: uris.length, indexSize: size, duration: performance.now() - t1 });

	}));
	// stop on server-end
	const initCancel = new Promise(resolve => disposables.push(new vscode.Disposable(resolve)));
	vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Building Index...' }, () => Promise.race([init, initCancel]));

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
		let data: Uint8Array;
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.size > 1024 ** 2) {
			console.warn(`IGNORING "${uri.toString()}" because it is too large (${stat.size}bytes)`);
			data = new Uint8Array();
		} else {
			data = await vscode.workspace.fs.readFile(uri);
		}
		return data;
	});

	return vscode.Disposable.from(...disposables);
}
