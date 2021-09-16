/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { Queries } from '../queries';
import { SymbolIndex } from './symbolIndex';

export class CompletionItemProvider {

	constructor(private _symbols: SymbolIndex) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.CompletionRequest.type, { documentSelector: Queries.supportedLanguages('outline') });
		connection.onRequest(lsp.CompletionRequest.type, this.provideCompletionItems.bind(this));
	}

	async provideCompletionItems(params: lsp.CompletionParams): Promise<lsp.CompletionItem[]> {

		await this._symbols.update();

		const result: lsp.CompletionItem[] = [];
		for (let [key, symbols] of this._symbols.definitions) {
			const [first] = symbols;
			result.push({
				label: key,
				kind: CompletionItemProvider._kindMapping.get(first.kind)
			});
		}
		return result;
	}

	private static _kindMapping = new Map<lsp.SymbolKind, lsp.CompletionItemKind>([
		[lsp.SymbolKind.Class, lsp.CompletionItemKind.Class],
		[lsp.SymbolKind.Interface, lsp.CompletionItemKind.Interface],
		[lsp.SymbolKind.Field, lsp.CompletionItemKind.Field],
		[lsp.SymbolKind.Property, lsp.CompletionItemKind.Property],
		[lsp.SymbolKind.Event, lsp.CompletionItemKind.Event],
		[lsp.SymbolKind.Constructor, lsp.CompletionItemKind.Constructor],
		[lsp.SymbolKind.Method, lsp.CompletionItemKind.Method],
		[lsp.SymbolKind.Enum, lsp.CompletionItemKind.Enum],
		[lsp.SymbolKind.EnumMember, lsp.CompletionItemKind.EnumMember],
		[lsp.SymbolKind.Function, lsp.CompletionItemKind.Function],
		[lsp.SymbolKind.Variable, lsp.CompletionItemKind.Variable],
	]);
}
