/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DocumentSymbolProvider, WorkspaceSymbolProvider } from './features/symbols';
import { SelectionRangesProvider } from './features/selectionRanges';
import { Trees } from './trees';
import { Validation } from './features/validation';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "anylang" is now active!');
	const trees = new Trees(context);
	context.subscriptions.push(trees);
	context.subscriptions.push(new DocumentSymbolProvider(trees).register());
	context.subscriptions.push(new WorkspaceSymbolProvider(trees).register());
	context.subscriptions.push(new SelectionRangesProvider(trees).register());
	context.subscriptions.push(new Validation(trees));

	// status bar 
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
			tooltip = new vscode.MarkdownString('Only _inaccurate_ language support can be offered for this file. For better language support you can [continue working on](command:remoteHub.continueOn \'Continue working on this remote repository elsewhere\') this file elsewhere.');
			tooltip.isTrusted = true;
		} else {
			tooltip = new vscode.MarkdownString('Only _inaccurate_ language support can be offered for this file.');
		}

		status.text = '$(quote)';
		status.tooltip = tooltip;
		status.show();
	}

	updateStatusBar(vscode.window.activeTextEditor);
	vscode.window.onDidChangeActiveTextEditor(updateStatusBar, undefined, context.subscriptions);
}
