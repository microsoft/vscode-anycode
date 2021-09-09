/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { asLspRange, nodeAtPosition } from '../common';
import { DocumentStore } from '../documentStore';
import { SymbolIndex } from './symbolIndex';
import { Trees } from '../trees';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { FileInfo } from './fileInfo';

export class DefinitionProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private readonly _symbols: SymbolIndex
	) { }

	register(connection: lsp.Connection) {
		connection.onDefinition(this.provideDefinitions.bind(this));
	}

	async provideDefinitions(params: lsp.DefinitionParams): Promise<lsp.Location[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		const result: lsp.Location[] = [];
		if (this._findDefinitionsInFile(document, params.position, result)) {
			return result;
		}

		const tree = this._trees.getParseTree(document);
		if (!tree) {
			return result;
		}
		const node = nodeAtPosition(tree.rootNode, params.position);
		if (!node) {
			return result;
		}

		const text = node.text;
		await this._symbols.update();

		const all = this._symbols.symbols.get(text);
		if (!all) {
			return result;
		}
		const promises: Promise<any>[] = [];
		for (const symbol of all) {
			result.push(symbol.location);
		}
		await Promise.all(promises);
		return result;
	}

	private _findDefinitionsInFile(document: TextDocument, position: lsp.Position, result: lsp.Location[]) {
		const info = FileInfo.create(document, this._trees);
		const scope = info.root.findScope(position);
		const usage = scope.findUsage(position) ?? scope.findDefinition(position);
		if (!usage) {
			return false;
		}
		const definitions = scope.findDefinitions(usage.text);
		if (definitions.length === 0) {
			return false;
		}
		for (let def of definitions) {
			result.push(lsp.Location.create(document.uri, asLspRange(def)));
		}
		return true;
	}
}
