/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { SupportedLanguages } from '../supportedLanguages';
import { SymbolIndex } from './symbolIndex';

export class CompletionItemProvider implements vscode.CompletionItemProvider {

	constructor(private _languages: SupportedLanguages, private _symbols: SymbolIndex) { }

	register(): vscode.Disposable {
		return vscode.languages.registerCompletionItemProvider(this._languages.getSupportedLanguagesAsSelector(), this);
	}

	async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[]> {

		const range = document.getWordRangeAtPosition(position) ?? new vscode.Range(position, position);
		const prefix = document.getText(range);

		await this._symbols.update();

		const result: vscode.CompletionItem[] = [];
		const all = this._symbols.trie.query([...prefix]);
		for (let [key] of all) {
			result.push(new vscode.CompletionItem(key));
		}
		return result;
	}
}
