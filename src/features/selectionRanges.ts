/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Parser } from '../../tree-sitter/tree-sitter';
import * as vscode from 'vscode';
import { ITrees, asCodeRange as asCodeRange, StopWatch } from '../common';

export class SelectionRangesProvider implements vscode.SelectionRangeProvider {

	constructor(private _trees: ITrees) { }

	register(): vscode.Disposable {
		return vscode.languages.registerSelectionRangeProvider(Array.from(this._trees.supportedLanguages), this);
	}

	async provideSelectionRanges(document: vscode.TextDocument, positions: vscode.Position[], token: vscode.CancellationToken) {

		const tree = await this._trees.getParseTree(document, token);
		if (!tree) {
			return undefined;
		}

		const sw = new StopWatch();
		sw.reset();
		const result: vscode.SelectionRange[] = [];

		for (const position of positions) {
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

			let parent: vscode.SelectionRange | undefined;
			for (let node of stack) {
				let range = new vscode.SelectionRange(asCodeRange(node), parent);
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
