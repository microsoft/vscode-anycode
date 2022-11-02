/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type Parser from 'web-tree-sitter';
import * as lsp from 'vscode-languageserver';
import { asLspRange as asLspRange } from '../common';
import { Trees } from '../trees';
import { DocumentStore } from '../documentStore';
import Languages from '../languages';

export class SelectionRangesProvider {

	constructor(private _documents: DocumentStore, private _trees: Trees) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.SelectionRangeRequest.type, { documentSelector: Languages.allAsSelector() });
		connection.onRequest(lsp.SelectionRangeRequest.type, this.provideSelectionRanges.bind(this));
	}

	async provideSelectionRanges(params: lsp.SelectionRangeParams) {

		const document = await this._documents.retrieve(params.textDocument.uri);
		const tree = await this._trees.getParseTree(document);
		if (!tree) {
			return [];
		}

		const result: lsp.SelectionRange[] = [];

		for (const position of params.positions) {
			const stack: Parser.SyntaxNode[] = [];
			const offset = document.offsetAt(position);

			let node = tree.rootNode;
			stack.push(node);

			while (true) {
				let child = node.namedChildren.find(candidate => {
					return candidate.startIndex <= offset && candidate.endIndex > offset;
				});

				if (child) {
					stack.push(child);
					node = child;
					continue;
				}
				break;
			}

			let parent: lsp.SelectionRange | undefined;
			for (let node of stack) {
				let range = lsp.SelectionRange.create(asLspRange(node), parent);
				parent = range;
			}
			if (parent) {
				result.push(parent);
			}
		}

		return result;
	}

}
