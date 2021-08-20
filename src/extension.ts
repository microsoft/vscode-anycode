/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DefinitionProvider, DocumentSymbolProvider, SymbolIndex, WorkspaceSymbolProvider } from './features/symbols';
import { SelectionRangesProvider } from './features/selectionRanges';
import { Trees } from './trees';
import { Validation } from './features/validation';
import { SupportedLanguages } from './supportedLanguages';


export async function activate(context: vscode.ExtensionContext) {

	// --- tree and symbols management

	const supportedLanguages = new SupportedLanguages(context);
	const trees = new Trees(context, supportedLanguages);
	const index = new SymbolIndex(trees, supportedLanguages);

	context.subscriptions.push(supportedLanguages);
	context.subscriptions.push(trees);
	context.subscriptions.push(index);

	// --- features

	const workspaceSymbols = new WorkspaceSymbolProvider(index);
	const definitions = new DefinitionProvider(trees, index);
	const documentSymbols = new DocumentSymbolProvider(trees);
	const selectionRanges = new SelectionRangesProvider(trees);
	const validation = new Validation(trees);

	const featureDisposables: vscode.Disposable[] = [];
	const registerFeatues = () => {
		unregisterFeatues();
		featureDisposables.push(workspaceSymbols.register());
		featureDisposables.push(definitions.register());
		featureDisposables.push(documentSymbols.register());
		featureDisposables.push(selectionRanges.register());
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
	// const item = vscode.languages.createLanguageStatusItem(trees.supportedLanguages);
	// context.subscriptions.push(item);
	// let tooltip: vscode.MarkdownString;
	// if (vscode.extensions.getExtension('github.remotehub-insiders')) {
	// 	tooltip = new vscode.MarkdownString('Only _basic_ language support can be offered for this file. For better language support you can [continue working on](command:remoteHub.continueOn \'Continue working on this remote repository elsewhere\') this file elsewhere.');
	// 	tooltip.isTrusted = true;
	// } else {
	// 	tooltip = new vscode.MarkdownString('Only _basic_ language support can be offered for this file.');
	// }
	// item.detail = tooltip;
	// item.text = `$(quote)`;
	// item.severity = vscode.LanguageStatusSeverity.Warning;

	// -- status
	const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MIN_SAFE_INTEGER);
	status.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
	status.hide();
	function updateStatusBar(editor?: vscode.TextEditor) {
		if (!editor) {
			status.hide();
			return;
		}
		if (!editor.viewColumn) {
			// ignore editor which isn't in the editor area
			return;
		}
		if (!vscode.languages.match(trees.supportedLanguages, editor.document)) {
			status.hide();
			return;
		}

		let tooltip: vscode.MarkdownString;
		if (vscode.extensions.getExtension('github.remotehub-insiders')) {
			tooltip = new vscode.MarkdownString('Only _basic_ language support can be offered for this file. For better language support you can [continue working on](command:remoteHub.continueOn \'Continue working on this remote repository elsewhere\') this file elsewhere.');
			tooltip.isTrusted = true;
		} else {
			tooltip = new vscode.MarkdownString('Only _basic_ language support can be offered for this file.');
		}

		status.text = '$(quote)';
		status.tooltip = tooltip;
		status.show();
	}

	updateStatusBar(vscode.window.activeTextEditor);
	vscode.window.onDidChangeActiveTextEditor(updateStatusBar, undefined, context.subscriptions);
}
