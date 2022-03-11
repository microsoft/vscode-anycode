/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { asLspRange, containsPosition, identifierAtPosition } from '../common';
import { DocumentStore } from '../documentStore';
import Languages from '../languages';
import { Trees } from '../trees';
import { Locals } from './locals';
import { SymbolIndex } from './symbolIndex';

export class ReferencesProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private readonly _symbols: SymbolIndex
	) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.ReferencesRequest.type, { documentSelector: Languages.getSupportedLanguages('references', ['locals', 'identifiers', 'references']) });
		connection.onRequest(lsp.ReferencesRequest.type, this.provideReferences.bind(this));
	}

	async provideReferences(params: lsp.ReferenceParams): Promise<lsp.Location[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		// find references inside file
		const info = Locals.create(document, this._trees);
		const anchor = info.root.findDefinitionOrUsage(params.position);

		if (anchor && !anchor.scope.likelyExports) {
			const definitions = anchor.scope.findDefinitions(anchor.name);
			if (definitions.length > 0) {
				const result: lsp.Location[] = [];
				for (let def of definitions) {
					if (params.context.includeDeclaration) {
						result.push(lsp.Location.create(document.uri, def.range));
					}
				}
				const usages = anchor.scope.findUsages(anchor.name);
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

		const query = Languages.getQuery(document.languageId, 'identifiers');
		const ident = identifierAtPosition(query, tree.rootNode, position)?.text;
		if (!ident) {
			// not an identifier
			return [];
		}

		const result: lsp.Location[] = [];
		let seenAsUsage = false;
		let seenAsDef = false;

		const usages = await this._symbols.getUsages(ident, document);
		for (let usage of usages) {
			seenAsUsage = seenAsUsage || containsPosition(usage.range, position);
			result.push(usage);
		}

		const definitions = await this._symbols.getDefinitions(ident, document);
		for (const { location } of definitions) {
			seenAsDef = seenAsDef || containsPosition(location.range, position);
			if (includeDeclaration) {
				result.push(location);
			}
		}

		if (!seenAsUsage && !seenAsDef) {
			// flishy results because we didn't see the location at which we requested references
			return [];
		}

		return result;
	}
}

export interface IUsage {
	name: string;
	range: lsp.Range;
	kind: lsp.SymbolKind;
}

export function getDocumentUsages(document: TextDocument, trees: Trees): IUsage[] {
	const tree = trees.getParseTree(document);
	if (!tree) {
		return [];
	}

	const query = Languages.getQuery(document.languageId, 'references');
	const captures = query.captures(tree.rootNode);

	const result: IUsage[] = [];

	for (let capture of captures) {
		const name = capture.node.text;
		const range = asLspRange(capture.node);
		result.push({
			name,
			range,
			kind: lsp.SymbolKind.File
		});
	}

	return result;
}
