/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CompletionItem, CompletionItemKind, CompletionParams, Connection, DefinitionParams, Location, SymbolKind, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { asCodeRange, nodeAtPosition } from '../common';
import { SymbolIndex } from '../symbolIndex';
import { Trees } from '../trees';

export class DefinitionProvider {

	constructor(
		private readonly _document: TextDocuments<TextDocument>,
		private readonly _trees: Trees,
		private _symbols: SymbolIndex
	) { }

	register(connection: Connection) {
		connection.onDefinition(this.provideDefinitions.bind(this));
	}

	async provideDefinitions(params: DefinitionParams): Promise<Location[]> {
		const document = this._document.get(params.textDocument.uri)!;
		const tree = await this._trees.getParseTree(document);
		if (!tree) {
			return [];
		}
		const node = nodeAtPosition(tree.rootNode, params.position);
		if (!node) {
			return [];
		}

		const text = node.text;
		await this._symbols.update();

		const result: Location[] = [];
		const all = this._symbols.symbols.get(text);
		if (!all) {
			return [];
		}
		const promises: Promise<any>[] = [];
		for (const symbol of all) {
			promises.push(this._collectSymbolsWithSameName(text, document.languageId, symbol.location.uri, result));

		}
		await Promise.all(promises);
		return result;
	}

	private async _collectSymbolsWithSameName(name: string, language: string, uri: string, bucket: Location[]) {
		const document = await this._symbols.documents.getOrLoadDocument(uri);
		const isSameLanguage = document.languageId !== language;
		const captures = await this._symbols.symbolCaptures(document);
		for (let capture of captures) {
			if (!capture.name.endsWith('.name') || capture.node.text !== name) {
				continue;
			}
			const location = Location.create(document.uri, asCodeRange(capture.node));
			if (isSameLanguage) {
				bucket.unshift(location);
			} else {
				bucket.push(location);
			}
		}
	}
}
