/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { SymbolIndex } from './symbolIndex';
import { Trees } from '../trees';
import { DocumentStore } from '../documentStore';
import { Locals } from './locals';
import { Queries } from '../queries';
import { containsPosition, nodeAtPosition } from '../common';
import { TextDocument } from 'vscode-languageserver-textdocument';

export class ReferencesProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private readonly _symbols: SymbolIndex
	) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.ReferencesRequest.type, { documentSelector: Queries.supportedLanguages('locals') });
		connection.onRequest(lsp.ReferencesRequest.type, this.provideReferences.bind(this));
	}

	async provideReferences(params: lsp.ReferenceParams): Promise<lsp.Location[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		// find references inside file
		const info = Locals.create(document, this._trees);
		const scope = info.root.findScope(params.position);
		const anchor = scope.findDefinitionOrUsage(params.position);
		if (anchor) {
			const definitions = scope.findDefinitions(anchor.name);
			if (definitions.length > 0) {
				const result: lsp.Location[] = [];
				for (let def of definitions) {
					if (params.context.includeDeclaration) {
						result.push(lsp.Location.create(document.uri, def.range));
					}
				}
				const usages = scope.findUsages(anchor.name);
				for (let usage of usages) {
					result.push(lsp.Location.create(document.uri, usage.range));
				}
				return result;
			}
		}

		// find references globally
		return await this._findGlobalReferences(document, params.position, params.context.includeDeclaration);

	}

	private async _findGlobalReferences(document: TextDocument, position: lsp.Position, includeDeclaration: boolean): Promise<lsp.Location[]> {
		const tree = this._trees.getParseTree(document);
		if (!tree) {
			return [];
		}

		const query = Queries.get(document.languageId, 'identifiers');
		const candidate = nodeAtPosition(tree.rootNode, position);
		if (query.captures(candidate).length !== 1) {
			// not an identifier
			return [];
		}

		await this._symbols.update();

		const result: lsp.Location[] = [];
		let seenAsUsage = false;
		let seenAsDef = false;
		const usages = this._symbols.usages.get(candidate.text) ?? [];
		for (let usage of usages) {
			result.push(usage);
			seenAsUsage = seenAsUsage || containsPosition(usage.range, position);
		}

		const definitions = this._symbols.definitions.get(candidate.text) ?? [];
		for (let definition of definitions) {
			seenAsDef = seenAsDef || containsPosition(definition.location.range, position);
			if (includeDeclaration) {
				result.push(definition.location);
			}
		}

		return result;

	}
}
