/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CompletionItem, CompletionItemKind, CompletionParams, Connection, SymbolKind, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { SymbolIndex } from '../symbolIndex';

export class CompletionItemProvider {

	constructor(private _symbols: SymbolIndex) { }

	register(connection: Connection) {
		connection.onCompletion(this.provideCompletionItems.bind(this));
	}

	async provideCompletionItems(params: CompletionParams): Promise<CompletionItem[]> {

		await this._symbols.update();

		const result: CompletionItem[] = [];
		for (let [key, symbols] of this._symbols.symbols) {
			const [first] = symbols;
			result.push({
				label: key,
				kind: CompletionItemProvider._kindMapping.get(first.kind)
			});
		}
		return result;
	}

	private static _kindMapping = new Map<SymbolKind, CompletionItemKind>([
		[SymbolKind.Class, CompletionItemKind.Class],
		[SymbolKind.Interface, CompletionItemKind.Interface],
		[SymbolKind.Field, CompletionItemKind.Field],
		[SymbolKind.Property, CompletionItemKind.Property],
		[SymbolKind.Event, CompletionItemKind.Event],
		[SymbolKind.Constructor, CompletionItemKind.Constructor],
		[SymbolKind.Method, CompletionItemKind.Method],
		[SymbolKind.Enum, CompletionItemKind.Enum],
		[SymbolKind.EnumMember, CompletionItemKind.EnumMember],
		[SymbolKind.Function, CompletionItemKind.Function],
		[SymbolKind.Variable, CompletionItemKind.Variable],
	]);
}
