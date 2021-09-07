/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Connection, DocumentSymbol, DocumentSymbolParams, Range } from 'vscode-languageserver';
import { asCodeRange, containsRange, StopWatch } from '../common';
import { SymbolIndex, symbolMapping } from '../symbolIndex';
import type Parser from '../../../tree-sitter/tree-sitter';
import { DocumentStore } from '../documentStore';


//#region --- document symbols ---

class Node {
	readonly range: Range;
	readonly children: Node[] = [];
	constructor(readonly capture: Parser.QueryCapture) {
		this.range = asCodeRange(capture.node);
	}
}

export class DocumentSymbols {

	constructor(private readonly _documents: DocumentStore, private readonly _symbols: SymbolIndex) { }

	register(connection: Connection) {
		connection.onDocumentSymbol(this.provideDocumentSymbols.bind(this));
	}

	async provideDocumentSymbols(params: DocumentSymbolParams): Promise<DocumentSymbol[]> {

		const sw = new StopWatch();
		const document = await this._documents.retrieve(params.textDocument.uri);
		const captures = await this._symbols.symbolCaptures(document);
		sw.elapsed('CAPTURE query');

		// build a Node-tree that is based on range containment. This includes true 
		// children as well as the "name-child"
		sw.reset();
		const roots: Node[] = [];
		const stack: Node[] = [];
		for (const capture of captures) {
			const node = new Node(capture);
			let parent = stack.pop();
			while (true) {
				if (!parent) {
					roots.push(node);
					stack.push(node);
					break;
				}
				if (containsRange(parent.range, node.range)) {
					parent.children.push(node);
					stack.push(parent);
					stack.push(node);
					break;
				}
				parent = stack.pop();
			}
		}
		sw.elapsed('make TREE');

		// build DocumentSymbol-tree from Node-tree. Children of nodes that match
		// the `<xyz>.name` capture name are used as identifier/name and aren't producing
		// a dedicated document symbol
		function build(node: Node, bucket: DocumentSymbol[]): void {
			let children: DocumentSymbol[] = [];
			let nameNode: Node | undefined;
			for (let child of node.children) {
				if (!nameNode && child.capture.name === `${node.capture.name}.name`) {
					nameNode = child;
				} else {
					build(child, children);
				}
			}
			if (!nameNode) {
				nameNode = node;
			}
			const symbol = DocumentSymbol.create(nameNode.capture.node.text, '', symbolMapping.getSymbolKind(node.capture.name), node.range, nameNode.range);
			symbol.children = children;

			bucket.push(symbol);
		}

		sw.reset();
		const result: DocumentSymbol[] = [];
		for (let node of roots) {
			build(node, result);
		}
		sw.elapsed('make SYMBOLS');

		return result;
	}
}

//#endregion
