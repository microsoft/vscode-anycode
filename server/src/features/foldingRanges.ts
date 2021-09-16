/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { StopWatch } from '../common';
import { Trees } from '../trees';
import { DocumentStore } from '../documentStore';
import { Queries } from '../queries';

export class FoldingRangeProvider {

	constructor(private _documents: DocumentStore, private _trees: Trees) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.FoldingRangeRequest.type, { documentSelector: Queries.supportedLanguages('comments', 'folding') });
		connection.onRequest(lsp.FoldingRangeRequest.type, this.provideFoldingRanges.bind(this));
	}

	async provideFoldingRanges(params: lsp.FoldingRangeParams) {

		const document = await this._documents.retrieve(params.textDocument.uri);
		const tree = this._trees.getParseTree(document);
		if (!tree) {
			return [];
		}

		const result: lsp.FoldingRange[] = [];
		const sw = new StopWatch();
		const commentQuery = Queries.get(document.languageId, 'comments');
		const commentCaptures = commentQuery.captures(tree.rootNode);

		const foldingQuery = Queries.get(document.languageId, 'folding');
		const foldingCaptures = foldingQuery.captures(tree.rootNode);

		for (const capture of [commentCaptures, foldingCaptures].flat()) {
			result.push(lsp.FoldingRange.create(
				capture.node.startPosition.row,
				capture.node.endPosition.row,
				capture.node.startPosition.column,
				capture.node.endPosition.column,
				capture.name
			));
		}

		sw.elapsed('folding RANGES');
		return result;
	}

}
