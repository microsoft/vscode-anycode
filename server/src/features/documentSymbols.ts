/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { QueryCapture } from '../../tree-sitter/tree-sitter';
import { asLspRange, containsRange, symbolMapping } from '../common';
import { DocumentStore } from '../documentStore';
import Languages from '../languages';
import { Trees } from '../trees';

export class DocumentSymbols {

	constructor(private readonly _documents: DocumentStore, private readonly _trees: Trees) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.DocumentSymbolRequest.type, { documentSelector: Languages.getSupportedLanguages('outline', ['outline']) });
		connection.onRequest(lsp.DocumentSymbolRequest.type, this.provideDocumentSymbols.bind(this));
	}

	async provideDocumentSymbols(params: lsp.DocumentSymbolParams): Promise<lsp.DocumentSymbol[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);
		return getDocumentSymbols(document, this._trees, false);
	}
}

export function getDocumentSymbols(document: TextDocument, trees: Trees, flat: boolean): lsp.DocumentSymbol[] {

	class Node {
		readonly range: lsp.Range;
		readonly children: Node[] = [];
		constructor(readonly capture: QueryCapture) {
			this.range = asLspRange(capture.node);
		}
	}

	const tree = trees.getParseTree(document);
	if (!tree) {
		return [];
	}
	const query = Languages.getQuery(document.languageId, 'outline');
	const captures = query.captures(tree.rootNode);


	// build a Node-tree that is based on range containment. This includes true 
	// children as well as the "name-child"
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

	// build DocumentSymbol-tree from Node-tree. Children of nodes that match
	// the `<xyz>.name` capture name are used as identifier/name and aren't producing
	// a dedicated document symbol
	function build(node: Node, bucket: lsp.DocumentSymbol[]): void {
		let children: lsp.DocumentSymbol[] = [];
		let nameNode: Node | undefined;
		for (let child of node.children) {
			if (!nameNode && child.capture.name.endsWith('.name') && child.capture.name.startsWith(node.capture.name)) {
				nameNode = child;
			} else {
				build(child, children);
			}
		}
		if (!nameNode) {
			nameNode = node;
		}
		const symbol = lsp.DocumentSymbol.create(nameNode.capture.node.text, '', symbolMapping.getSymbolKind(node.capture.name), node.range, nameNode.range);
		symbol.children = children;

		bucket.push(symbol);
	}


	const result: lsp.DocumentSymbol[] = [];
	for (let node of roots) {
		build(node, result);
	}

	if (!flat) {
		return result;
	}

	const flatResult: lsp.DocumentSymbol[] = [];
	(function flatten(all: lsp.DocumentSymbol[]) {
		for (let item of all) {
			flatResult.push(item);
			if (item.children) {
				flatten(item.children);
			}
		}
	})(result);
	return flatResult;
}
