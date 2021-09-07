/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type Parser from '../../../tree-sitter/tree-sitter';
import { Connection, SelectionRange, SelectionRangeParams } from 'vscode-languageserver';
import { asCodeRange as asCodeRange, StopWatch } from '../common';
import { Trees } from '../trees';
import { DocumentStore } from '../documentStore';

export class SelectionRangesProvider {

	constructor(private _documents: DocumentStore, private _trees: Trees) { }

	register(connection: Connection) {
		connection.onSelectionRanges(this.provideSelectionRanges.bind(this));
	}

	async provideSelectionRanges(params: SelectionRangeParams) {

		const document = await this._documents.retrieve(params.textDocument.uri);
		const tree = await this._trees.getParseTree(document);

		const sw = new StopWatch();
		const result: SelectionRange[] = [];

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

			let parent: SelectionRange | undefined;
			for (let node of stack) {
				let range = SelectionRange.create(asCodeRange(node), parent);
				parent = range;
			}
			if (parent) {
				result.push(parent);
			}
		}
		sw.elapsed('selection RANGES');
		return result;
	}

}
