/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { asLspRange, containsPosition, containsRange } from '../common';
import { Trees } from '../trees';
import { QueryCapture, SyntaxNode } from '../../tree-sitter/tree-sitter';
import { Queries } from '../queries';
import { TextDocument } from 'vscode-languageserver-textdocument';

export class FileInfo {

	static create(document: TextDocument, trees: Trees): FileInfo {

		const root = new Scope(
			lsp.Range.create(0, 0, document.lineCount, 0),
			undefined
		);

		const tree = trees.getParseTree(document);
		const query = Queries.get(document.languageId, 'scopes', 'definitions', 'usages');
		if (!tree) {
			return new FileInfo(document, root);
		}

		const captures = query
			.captures(tree.rootNode)
			.sort(this._compareCaptures);

		const stack: Scope[] = [];

		for (const capture of captures) {

			if (capture.name.startsWith('scope')) {
				let parent = stack.pop();
				const range = asLspRange(capture.node);
				while (true) {
					if (!parent) {
						const scope = new Scope(range, root);
						root.children.add(scope);
						stack.push(scope);
						break;
					}
					if (containsRange(parent.range, range)) {
						const scope = new Scope(range, parent);
						parent.children.add(scope);
						stack.push(parent);
						stack.push(scope);
						break;
					}
					parent = stack.pop();
				}

			} else if (capture.name.startsWith('symbol.') && capture.name.endsWith('.name')) {
				const scope = stack[stack.length - 1] ?? root;
				scope.definitions.add(capture.node);

			} else if (capture.name === 'usage') {
				const scope = stack[stack.length - 1] ?? root;
				scope.usages.add(capture.node);

			}
		}

		return new FileInfo(document, root);
	}

	private static _compareCaptures(a: QueryCapture, b: QueryCapture) {
		return a.node.startIndex - b.node.startIndex;
	}

	private constructor(
		readonly document: TextDocument,
		readonly root: Scope
	) { }
}

export class Scope {

	readonly children = new Set<Scope>();
	readonly definitions = new Set<SyntaxNode>();
	readonly usages = new Set<SyntaxNode>();

	constructor(
		readonly range: lsp.Range,
		readonly parent: Scope | undefined
	) { }

	findScope(position: lsp.Position): Scope {
		for (let child of this.children) {
			if (containsPosition(child.range, position)) {
				return child.findScope(position);
			}
		}
		return this;
	}

	findUsage(position: lsp.Position): SyntaxNode | undefined {
		for (let usage of this.usages) {
			if (containsPosition(asLspRange(usage), position)) {
				return usage;
			}
		}
	}

	findDefinition(position: lsp.Position): SyntaxNode | undefined {
		for (let usage of this.definitions) {
			if (containsPosition(asLspRange(usage), position)) {
				return usage;
			}
		}
	}

	findDefinitions(text: string): SyntaxNode[] {
		const result = Array.from(this.definitions).filter(node => node.text === text);
		if (result.length > 0) {
			return result;
		}
		if (!this.parent) {
			return [];
		}
		return this.parent.findDefinitions(text);
	}

	findUsages(text: string): SyntaxNode[] {
		const bucket: SyntaxNode[][] = [];

		// find higest scope defining
		let scope: Scope = this;
		while (scope.parent && !scope._defines(text)) {
			scope = scope.parent;
		}
		// find usages in all child scope (unless also defined there)
		scope._findUsagesDown(text, bucket);
		return bucket.flat();
	}

	private _findUsagesDown(text: string, bucket: SyntaxNode[][]): void {

		// usages in this scope
		const result = Array.from(this.usages).filter(node => node.text === text);
		bucket.push(result);

		// usages in child scope (unless also defined there)
		for (let child of this.children) {
			if (!child._defines(text)) {
				child._findUsagesDown(text, bucket);
			}
		}
	}

	private _defines(text: string): boolean {
		for (let def of this.definitions) {
			if (def.text === text) {
				return true;
			}
		}
		return false;
	}

	toString(nest: number = 0) {
		let r = `${' '.repeat(nest)}Scope@${this.range.start.line},${this.range.start.character}=-${this.range.end.line},${this.range.end.character}, 
		DEFINES: ${Array.from(this.definitions.values()).map(node => node.text)}
		USES: ${Array.from(this.usages.values()).map(node => node.text)}
		`;

		for (let item of this.children) {
			r += `\n${item.toString(nest + 1)}`;
		}
		return r;
	}
}
