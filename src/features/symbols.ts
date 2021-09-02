/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type Parser from '../../tree-sitter/tree-sitter';
import * as vscode from 'vscode';
import { ITrees, asCodeRange, StopWatch, containsLocation } from '../common';
import { SymbolIndex, symbolQueries, Usage } from './symbolIndex';


// --- document symbols

export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	constructor(private _trees: ITrees) { }

	register(): vscode.Disposable {
		return vscode.languages.registerDocumentSymbolProvider(this._trees.supportedLanguages, this);
	}

	async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken) {

		const tree = await this._trees.getParseTree(document, token);
		if (!tree) {
			return undefined;
		}

		const query = symbolQueries.get(document.languageId, tree.getLanguage());
		if (!query) {
			return undefined;
		}

		const sw = new StopWatch();

		sw.reset();
		const captures = query.captures(tree.rootNode);
		sw.elapsed('CAPTURE query');


		class Node {
			readonly range: vscode.Range;
			readonly children: Node[] = [];
			constructor(readonly capture: Parser.QueryCapture) {
				this.range = asCodeRange(capture.node);
			}
		}
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
				if (parent.range.contains(node.range)) {
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
		function build(node: Node, bucket: vscode.DocumentSymbol[]): void {
			let children: vscode.DocumentSymbol[] = [];
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
			const symbol = new vscode.DocumentSymbol(nameNode.capture.node.text, '', symbolQueries.getSymbolKind(node.capture.name), node.range, nameNode.range);
			symbol.children = children;

			bucket.push(symbol);
		}

		sw.reset();
		const result: vscode.DocumentSymbol[] = [];
		for (let node of roots) {
			build(node, result);
		}
		sw.elapsed('make SYMBOLS');

		return result;
	}
}

// --- symbol search


export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {

	constructor(private _symbols: SymbolIndex) { }

	register(): vscode.Disposable {
		return vscode.languages.registerWorkspaceSymbolProvider(this);
	}

	async provideWorkspaceSymbols(search: string, token: vscode.CancellationToken) {

		const result: vscode.SymbolInformation[][] = [];

		await this._symbols.update();

		const sw = new StopWatch();
		const all = this._symbols.symbols.query(Array.from(search));
		for (let [, symbols] of all) {
			result.push(Array.from(symbols));
		}
		sw.elapsed('WORKSPACE symbol search');

		return result.flat();
	}

}

// Find all symbols (that would be in outline) that have the same name as the word under the 
// cursor. This works but doesn't find non-outline things like local variables etc.
export class DefinitionProvider implements vscode.DefinitionProvider {

	constructor(private _trees: ITrees, private _symbols: SymbolIndex) { }

	register(): vscode.Disposable {
		return vscode.languages.registerDefinitionProvider(this._trees.supportedLanguages, this);
	}

	async provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
		const range = document.getWordRangeAtPosition(position);
		if (!range) {
			return [];
		}
		const text = document.getText(range);
		await this._symbols.update();

		const result: vscode.Location[] = [];
		const all = this._symbols.symbols.get(text);
		if (!all) {
			return [];
		}
		const promises: Promise<any>[] = [];
		for (const symbol of all) {
			promises.push(this._collectSymbolsWithSameName(text, document.languageId, symbol.location.uri, token, result));

		}
		await Promise.all(promises);
		return result;
	}

	private async _collectSymbolsWithSameName(name: string, language: string, uri: vscode.Uri, token: vscode.CancellationToken, bucket: vscode.Location[]) {
		const document = await this._symbols.documents.getOrLoadDocument(uri);
		const isSameLanguage = document.languageId !== language;
		const captures = await this._symbols.symbolCaptures(document, token);
		for (let capture of captures) {
			if (!capture.name.endsWith('.name') || capture.node.text !== name) {
				continue;
			}
			const location = new vscode.Location(document.uri, asCodeRange(capture.node));
			if (isSameLanguage) {
				bucket.unshift(location);
			} else {
				bucket.push(location);
			}
		}
	}
}

//
export class ReferencesProvider implements vscode.ReferenceProvider {

	constructor(private _trees: ITrees, private _symbols: SymbolIndex) { }

	register(): vscode.Disposable {
		return vscode.languages.registerReferenceProvider(this._trees.supportedLanguages, this);
	}

	async provideReferences(document: vscode.TextDocument, position: vscode.Position, context: vscode.ReferenceContext, token: vscode.CancellationToken): Promise<vscode.Location[]> {
		const range = document.getWordRangeAtPosition(position);
		if (!range) {
			return [];
		}
		const text = document.getText(range);
		await this._symbols.update();

		const usages = this._symbols.usages.get(text);
		const symbols = this._symbols.symbols.get(text);
		if (!usages && !symbols) {
			return [];
		}

		const locationsByKind = new Map<number, vscode.Location[]>();
		let thisKind: number | undefined;
		if (usages) {
			for (let usage of usages) {
				if (thisKind === undefined) {
					if (containsLocation(usage.location, document.uri, position)) {
						thisKind = usage.kind;
					}
				}
				const array = locationsByKind.get(usage.kind ?? -1);
				if (!array) {
					locationsByKind.set(usage.kind ?? -1, [usage.location]);
				} else {
					array.push(usage.location);
				}
			}
		}

		if (symbols) {
			for (let symbol of symbols) {
				if (thisKind === undefined) {
					if (containsLocation(symbol.location, document.uri, position)) {
						thisKind = symbol.kind;
					}
				}
				if (context.includeDeclaration) {
					const array = locationsByKind.get(symbol.kind);
					if (!array) {
						locationsByKind.set(symbol.kind, [symbol.location]);
					} else {
						array.push(symbol.location);
					}
				}
			}
		}

		if (thisKind === undefined) {
			return Array.from(locationsByKind.values()).flat();

		} else {
			const sameKind = locationsByKind.get(thisKind) ?? [];
			const unknownKind = locationsByKind.get(-1) ?? [];
			return [sameKind, unknownKind].flat();
		}
	}
}
