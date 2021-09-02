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
		const all = this._symbols.symbols.query([...prefix]);
		for (let [key, symbols] of all) {
			const [first] = symbols;
			const item = new vscode.CompletionItem(key, CompletionItemProvider._kindMapping.get(first.kind));
			result.push(item);
		}
		return result;
	}

	private static _kindMapping = new Map<vscode.SymbolKind, vscode.CompletionItemKind>([
		[vscode.SymbolKind.Class, vscode.CompletionItemKind.Class],
		[vscode.SymbolKind.Interface, vscode.CompletionItemKind.Interface],
		[vscode.SymbolKind.Field, vscode.CompletionItemKind.Field],
		[vscode.SymbolKind.Property, vscode.CompletionItemKind.Property],
		[vscode.SymbolKind.Event, vscode.CompletionItemKind.Event],
		[vscode.SymbolKind.Constructor, vscode.CompletionItemKind.Constructor],
		[vscode.SymbolKind.Method, vscode.CompletionItemKind.Method],
		[vscode.SymbolKind.Enum, vscode.CompletionItemKind.Enum],
		[vscode.SymbolKind.EnumMember, vscode.CompletionItemKind.EnumMember],
		[vscode.SymbolKind.Function, vscode.CompletionItemKind.Function],
		[vscode.SymbolKind.Variable, vscode.CompletionItemKind.Variable],
	]);
}
