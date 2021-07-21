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

	const trees = new Trees(context);
	context.subscriptions.push(trees);
	context.subscriptions.push(new DocumentSymbolProvider(trees).register());
	context.subscriptions.push(new WorkspaceSymbolProvider(trees).register());
	context.subscriptions.push(new SelectionRangesProvider(trees).register());
	context.subscriptions.push(new Validation(trees));

	// -- status
	const item = vscode.languages.createLanguageStatusItem(trees.supportedLanguages);
	context.subscriptions.push(item);
	let tooltip: vscode.MarkdownString;
	if (vscode.extensions.getExtension('github.remotehub-insiders')) {
		tooltip = new vscode.MarkdownString('Only _basic_ language support can be offered for this file. For better language support you can [continue working on](command:remoteHub.continueOn \'Continue working on this remote repository elsewhere\') this file elsewhere.');
		tooltip.isTrusted = true;
	} else {
		tooltip = new vscode.MarkdownString('Only _basic_ language support can be offered for this file.');
	}
	item.detail = tooltip;
	item.text = `$(quote)`;
	item.severity = vscode.LanguageStatusSeverity.Warning;

}
