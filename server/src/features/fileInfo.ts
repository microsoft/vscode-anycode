/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { asLspRange, containsPosition, containsRange, isBefore, isBeforeOrEqual, symbolMapping } from '../common';
import { Trees } from '../trees';
import { QueryCapture, SyntaxNode } from '../../tree-sitter/tree-sitter';
import { Queries } from '../queries';
import { TextDocument } from 'vscode-languageserver-textdocument';


export class FileInfo {

	static simple(document: TextDocument, trees: Trees): FileInfo {
		const root = new Scope(lsp.Range.create(0, 0, document.lineCount, 0));
		const tree = trees.getParseTree(document);
		if (tree) {
			const query = Queries.get(document.languageId, 'definitionsOutline', 'usages');
			const captures = query.captures(tree.rootNode);
			const nodes: Node[] = [];
			this._fillInDefinitionsAndUsages(nodes, captures);
			this._constructTree(root, nodes);
		}
		return new FileInfo(document, root);
	}

	static detailed(document: TextDocument, trees: Trees): FileInfo {
		const root = new Scope(lsp.Range.create(0, 0, document.lineCount, 0));
		const tree = trees.getParseTree(document);
		if (!tree) {
			return new FileInfo(document, root);
		}

		const all: Node[] = [];

		// Find all scopes and merge some. The challange is that function-bodies "see" their
		// arguments but function-block-nodes and argument-list-nodes are usually siblings
		const scopeQuery = Queries.get(document.languageId, 'scopes');
		const scopeCaptures = scopeQuery.captures(tree.rootNode).sort(this._compareCaptures);
		for (let i = 0; i < scopeCaptures.length; i++) {
			const capture = scopeCaptures[i];
			const range = asLspRange(capture.node);
			if (capture.name.endsWith('.merge')) {
				all[all.length - 1].range.end = range.end;
			} else {
				all.push(new Scope(range));
			}
		}

		// Find all definitions and usages and mix them with scopes
		const query = Queries.get(document.languageId, 'definitionsAll', 'usages');
		const captures = query.captures(tree.rootNode);
		this._fillInDefinitionsAndUsages(all, captures);

		//
		this._constructTree(root, all);

		return new FileInfo(document, root);
	}

	private static _fillInDefinitionsAndUsages(bucket: Node[], captures: QueryCapture[]): void {
		for (let capture of captures) {

			const match = /definition\.(\w+)\.name/.exec(capture.name);

			if (match) {
				bucket.push(new Definition(
					capture.node.text,
					asLspRange(capture.node),
					capture.name.includes('.variable.'),
					symbolMapping.getSymbolKind(match[1])
				));
			} else if (capture.name === 'usage') {
				bucket.push(new Usage(capture.node.text, asLspRange(capture.node)));
			}
		}
	}

	private static _constructTree(root: Scope, nodes: Node[]): void {
		const stack: Node[] = [];
		for (const thing of nodes.sort(this._compareByRange)) {
			while (true) {
				let parent = stack.pop() ?? root;
				if (containsRange(parent.range, thing.range)) {
					parent.addChild(thing);
					stack.push(parent);
					stack.push(thing);
					break;
				}
				if (parent === root) {
					// impossible ?!
					break;
				}
			}
		}
	}


	private static _compareCaptures(a: QueryCapture, b: QueryCapture) {
		return a.node.startIndex - b.node.startIndex;
	}

	private static _compareByRange<T extends { range: lsp.Range }>(a: T, b: T) {
		if (isBefore(a.range.start, b.range.start)) {
			return -1;
		} else if (isBefore(b.range.start, a.range.start)) {
			return 1;
		}
		// same start...
		if (isBefore(a.range.end, b.range.end)) {
			return -1;
		} else if (isBefore(b.range.end, a.range.end)) {
			return 1;
		}
		return 0;
	}

	private constructor(
		readonly document: TextDocument,
		readonly root: Scope
	) { }

}

const enum NodeType {
	'Scope', 'Definition', 'Usage'
}

abstract class Node {

	protected _parent: Node | undefined;
	protected _children: Node[] = [];

	constructor(
		readonly range: lsp.Range,
		readonly type: NodeType
	) { }

	addChild(node: Node) {
		this._children.push(node);
		node._parent = this;
	}

	toString() {
		return `${this.type}@${this.range.start.line},${this.range.start.character} -${this.range.end.line},${this.range.end.character}`;
	}
}

export class Usage extends Node {
	constructor(
		readonly name: string,
		range: lsp.Range
	) {
		super(range, NodeType.Usage);
	}

	addChild(node: Node) {
		// console.log('ignored', node.toString());
	}

	toString() {
		return `[usages] ${this.name}`;
	}
}

export class Definition extends Node {
	constructor(
		readonly name: string,
		readonly range: lsp.Range,
		readonly scoped: boolean,
		readonly kind: lsp.SymbolKind
	) {
		super(range, NodeType.Definition);
	}

	addChild(node: Node) {
		// console.log('ignored', node.toString());
	}

	toString() {
		return `[def] ${this.name}`;
	}
}

export class Scope extends Node {

	constructor(range: lsp.Range) {
		super(range, NodeType.Scope);
	}

	*definitions() {
		for (let item of this._children) {
			if (item instanceof Definition) {
				yield item;
			}
		}
	}
	*usages() {
		for (let item of this._children) {
			if (item instanceof Usage) {
				yield item;
			}
		}
	}
	*scopes() {
		for (let item of this._children) {
			if (item instanceof Scope) {
				yield item;
			}
		}
	}

	findScope(position: lsp.Position): Scope {
		for (let scope of this.scopes()) {
			if (containsPosition(scope.range, position)) {
				return scope.findScope(position);
			}
		}
		return this;
	}

	findAnchor(position: lsp.Position): Definition | Usage | undefined {
		for (let child of this._children) {
			if ((child instanceof Definition || child instanceof Usage) && containsPosition(child.range, position)) {
				return child;
			}
		}
	}


	findDefinitions(text: string): Definition[] {
		const result: Definition[] = [];
		for (let child of this.definitions()) {
			if (child.name === text) {
				result.push(child);
			}
		}
		if (result.length > 0) {
			return result;
		}
		if (!(this._parent instanceof Scope)) {
			return [];
		}
		return this._parent.findDefinitions(text);
	}

	findUsages(text: string): Usage[] {
		const bucket: Usage[][] = [];

		// find higest scope defining
		let scope: Scope = this;
		while (!scope._defines(text)) {
			if (scope._parent instanceof Scope) {
				scope = scope._parent;
			} else {
				break;
			}
		}
		// find usages in all child scope (unless also defined there)
		scope._findUsagesDown(text, bucket);
		return bucket.flat();
	}

	private _findUsagesDown(text: string, bucket: Usage[][]): void {

		// usages in this scope
		const result: Usage[] = [];
		for (let child of this.usages()) {
			if (child.name === text) {
				result.push(child);
			}
		}
		bucket.push(result);

		// usages in child scope (unless also defined there)
		for (let child of this.scopes()) {
			if (!child._defines(text)) {
				child._findUsagesDown(text, bucket);
			}
		}
	}

	private _defines(text: string): boolean {
		for (let child of this.definitions()) {
			if (child.name === text) {
				return true;
			}
		}
		return false;
	}
}
