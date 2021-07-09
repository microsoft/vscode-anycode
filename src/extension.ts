/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DocumentSymbolProvider } from './features/documentSymbols';
import { SelectionRangesProvider } from './features/selectionRanges';
import { Trees } from './trees';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "anylang" is now active!');
	const trees = new Trees(context);
	context.subscriptions.push(trees);
	context.subscriptions.push(new DocumentSymbolProvider(trees).register());
	context.subscriptions.push(new SelectionRangesProvider(trees).register());
}
