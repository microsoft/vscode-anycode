/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DefinitionProvider, DocumentSymbolProvider, WorkspaceSymbolProvider } from './features/symbols';
import { SelectionRangesProvider } from './features/selectionRanges';
import { Trees } from './trees';
import { Validation } from './features/validation';
import { SupportedLanguages } from './supportedLanguages';
import { SymbolIndex } from './features/symbolIndex';
import { CompletionItemProvider } from './features/completions';
import Parser from '../tree-sitter/tree-sitter';

export async function activate(context: vscode.ExtensionContext) {

	await Parser.init({
		locateFile() {
			return vscode.Uri.joinPath(context.extensionUri, 'tree-sitter/tree-sitter.wasm').toString();
		}
	});

	// --- tree and symbols management

	const supportedLanguages = new SupportedLanguages(context);
	const trees = new Trees(supportedLanguages);
	const index = new SymbolIndex(trees, supportedLanguages);

	context.subscriptions.push(supportedLanguages);
	context.subscriptions.push(trees);
	context.subscriptions.push(index);

	// --- features

	const workspaceSymbols = new WorkspaceSymbolProvider(index);
	const definitions = new DefinitionProvider(trees, index);
	const documentSymbols = new DocumentSymbolProvider(trees);
	const selectionRanges = new SelectionRangesProvider(trees);
	const completions = new CompletionItemProvider(supportedLanguages, index);
	const validation = new Validation(trees);

	const featureDisposables: vscode.Disposable[] = [];
	const registerFeatues = () => {
		unregisterFeatues();
		featureDisposables.push(workspaceSymbols.register());
		featureDisposables.push(definitions.register());
		featureDisposables.push(documentSymbols.register());
		featureDisposables.push(selectionRanges.register());
		featureDisposables.push(completions.register());
		featureDisposables.push(validation.register());
	};
	const unregisterFeatues = () => {
		for (const item of featureDisposables) {
			item.dispose();
		}
	};
	registerFeatues();
	context.subscriptions.push(supportedLanguages.onDidChange(registerFeatues));
	context.subscriptions.push(new vscode.Disposable(unregisterFeatues));

	// --- build index

	vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: 'Building Index...' }, async task => {
		await index.init;
		await index.update();
	});

	// -- status (NEW proposal)
	const item = vscode.languages.createLanguageStatusItem('info', trees.supportedLanguages);
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
