/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { Trees } from '../trees';
import { DocumentStore } from '../documentStore';
import { Locals } from './locals';
import Languages from '../languages';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { asLspRange, identifierAtPosition } from '../common';

export class DocumentHighlightsProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
	) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.DocumentHighlightRequest.type, { documentSelector: Languages.getSupportedLanguages('highlights', ['locals', 'identifiers']) });
		connection.onRequest(lsp.DocumentHighlightRequest.type, this.provideDocumentHighlights.bind(this));
	}

	async provideDocumentHighlights(params: lsp.DocumentHighlightParams): Promise<lsp.DocumentHighlight[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		const info = await Locals.create(document, this._trees);
		const anchor = info.root.findDefinitionOrUsage(params.position);
		if (!anchor) {
			return this._identifierBasedHighlights(document, params.position);
		}
		const result: lsp.DocumentHighlight[] = [];
		for (let def of anchor.scope.findDefinitions(anchor.name)) {
			result.push(lsp.DocumentHighlight.create(def.range, lsp.DocumentHighlightKind.Write));
		}
		if (result.length === 0) {
			// needs a definition
			return this._identifierBasedHighlights(document, params.position);
		}
		for (let usage of anchor.scope.findUsages(anchor.name)) {
			result.push(lsp.DocumentHighlight.create(usage.range, lsp.DocumentHighlightKind.Read));
		}
		return result;
	}

	private async _identifierBasedHighlights(document: TextDocument, position: lsp.Position): Promise<lsp.DocumentHighlight[]> {
		const result: lsp.DocumentHighlight[] = [];
		const tree = await this._trees.getParseTree(document);
		if (!tree) {
			return result;
		}

		const query = Languages.getQuery(tree.getLanguage(), 'identifiers');
		const candidate = identifierAtPosition(query, tree.rootNode, position);
		if (!candidate) {
			// not on an identifier
			return result;
		}

		for (let capture of query.captures(tree.rootNode)) {
			// same node text, e.g foo vs bar
			if (capture.node.text === candidate.text) {
				result.push(lsp.DocumentHighlight.create(asLspRange(capture.node), lsp.DocumentHighlightKind.Text));
			}
		}

		return result;
	}
}
