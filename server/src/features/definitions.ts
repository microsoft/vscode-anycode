/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { DocumentStore } from '../documentStore';
import { SymbolIndex } from './symbolIndex';
import { Trees } from '../trees';
import { Locals } from './fileInfo';
import { nodeAtPosition } from '../common';
import { Queries } from '../queries';

export class DefinitionProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private readonly _symbols: SymbolIndex
	) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.DefinitionRequest.type, { documentSelector: Queries.supportedLanguages('locals', 'outline') });
		connection.onRequest(lsp.DefinitionRequest.type, this.provideDefinitions.bind(this));
	}

	async provideDefinitions(params: lsp.DefinitionParams): Promise<lsp.Location[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		// find definition in file
		const info = Locals.create(document, this._trees);
		const scope = info.root.findScope(params.position);
		const anchor = scope.findDefinitionOrUsage(params.position);
		if (anchor) {
			// find definition inside this file
			const definitions = scope.findDefinitions(anchor.name);
			if (definitions.length > 0) {
				return definitions.map(def => lsp.Location.create(document.uri, def.range));
			}
		}

		// find definition globally
		const tree = this._trees.getParseTree(document);
		if (!tree) {
			return [];
		}
		const result: lsp.Location[] = [];
		const text = nodeAtPosition(tree.rootNode, params.position).text;
		await this._symbols.update();
		const all = this._symbols.definitions.get(text);
		if (all) {
			for (const symbol of all) {
				result.push(symbol.location);
			}
		}
		return result;
	}
}
