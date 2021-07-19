/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Parser } from '../../tree-sitter/tree-sitter';
import * as vscode from 'vscode';
import { ITrees, asCodeRange, StopWatch, isInteresting } from '../common';


const _symbolQueries = new class {

	private readonly _data = new Map<string, Promise<{ default: string }> | Parser.Query>([
		['typescript', import('./queries-typescript')],
		['php', import('./queries-php')],
		['python', import('./queries-python')],
		['java', import('./queries-java')],
		['c', import('./queries-c')],
		['cpp', import('./queries-cpp')],
		['csharp', import('./queries-c_sharp')],
		['rust', import('./queries-rust')],
	]);

	private readonly _symbolKindMapping = new Map<string, vscode.SymbolKind>([
		['file', vscode.SymbolKind.File],
		['module', vscode.SymbolKind.Module],
		['namespace', vscode.SymbolKind.Namespace],
		['package', vscode.SymbolKind.Package],
		['class', vscode.SymbolKind.Class],
		['method', vscode.SymbolKind.Method],
		['property', vscode.SymbolKind.Property],
		['field', vscode.SymbolKind.Field],
		['constructor', vscode.SymbolKind.Constructor],
		['enum', vscode.SymbolKind.Enum],
		['interface', vscode.SymbolKind.Interface],
		['function', vscode.SymbolKind.Function],
		['variable', vscode.SymbolKind.Variable],
		['constant', vscode.SymbolKind.Constant],
		['string', vscode.SymbolKind.String],
		['number', vscode.SymbolKind.Number],
		['boolean', vscode.SymbolKind.Boolean],
		['array', vscode.SymbolKind.Array],
		['object', vscode.SymbolKind.Object],
		['key', vscode.SymbolKind.Key],
		['null', vscode.SymbolKind.Null],
		['enumMember', vscode.SymbolKind.EnumMember],
		['struct', vscode.SymbolKind.Struct],
		['event', vscode.SymbolKind.Event],
		['operator', vscode.SymbolKind.Operator],
		['typeParameter', vscode.SymbolKind.TypeParameter],
	]);

	isSupported(languageId: string): boolean {
		return this._data.has(languageId);
	}

	get languageIds(): string[] {
		return Array.from(this._data.keys());
	}

	async get(languageId: string, language: Parser.Language): Promise<Parser.Query | undefined> {
		let query = this._data.get(languageId);
		if (query instanceof Promise) {
			try {
				query = language.query((await query).default);
				this._data.set(languageId, query);
			} catch (e) {
				console.log(languageId, e);
				this._data.delete(languageId);
				query = undefined;
			}
		}
		return query;
	}

	getSymbolKind(symbolKind: string): vscode.SymbolKind {
		return this._symbolKindMapping.get(symbolKind) ?? vscode.SymbolKind.Variable;
	}
};

export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	constructor(private _trees: ITrees) { }

	register(): vscode.Disposable {
		return vscode.languages.registerDocumentSymbolProvider(_symbolQueries.languageIds, this);
	}

	async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken) {

		const tree = await this._trees.getParseTree(document, token);
		if (!tree) {
			return undefined;
		}

		const query = await _symbolQueries.get(document.languageId, tree.getLanguage());
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
			const symbol = new vscode.DocumentSymbol(nameNode.capture.node.text, '', _symbolQueries.getSymbolKind(node.capture.name), node.range, nameNode.range);
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

// class WorkspaceIndex {

// 	private readonly _ready: Promise<any>;

// 	private readonly _map = new Map<string, vscode.Uri>();
// 	private readonly _disposable: vscode.Disposable;

// 	constructor() {
// 		const sw = new StopWatch();
// 		const glob = '{**/*.c,**/*.cpp,**/*.h,**/*.cs,**/*.rs,**/*.py,**/*.java,**/*.php}';
// 		this._ready = Promise.resolve(vscode.workspace.findFiles(glob, undefined, 1000)).then(uris => {
// 			for (const uri of uris) {
// 				this._map.set(uri.toString(), uri);
// 			}
// 			sw.elapsed('all FILES: ' + this._map.size);
// 		});

// 		const watcher = vscode.workspace.createFileSystemWatcher(glob, undefined, true, undefined);
// 		watcher.onDidDelete(uri => this._map.delete(uri.toString()));
// 		watcher.onDidCreate(uri => this._map.set(uri.toString(), uri));

// 		this._disposable = new vscode.Disposable(() => {
// 			watcher.dispose();
// 		});
// 	}

// 	dispose(): void {
// 		this._disposable.dispose();
// 	}

// 	async *all() {
// 		await this._ready;

// 		const exclude = new Set<string>();
// 		vscode.workspace.textDocuments.forEach(d => exclude.add(d.uri.toString()));

// 		for (let [key, value] of this._map) {
// 			if (!exclude.has(key)) {
// 				yield value;
// 			}
// 		}
// 	}
// }

export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {

	constructor(private _trees: ITrees) { }

	register(): vscode.Disposable {
		return vscode.languages.registerWorkspaceSymbolProvider(this);
	}

	async provideWorkspaceSymbols(search: string, token: vscode.CancellationToken) {
		const sw = new StopWatch();
		const result: vscode.SymbolInformation[] = [];

		for (const document of vscode.workspace.textDocuments) {
			if (token.isCancellationRequested) {
				break;
			}
			if (!isInteresting(document) || !_symbolQueries.isSupported(document.languageId)) {
				continue;
			}
			const tree = await this._trees.getParseTree(document, token);
			if (!tree) {
				continue;
			}
			const query = await _symbolQueries.get(document.languageId, tree.getLanguage());
			if (!query) {
				continue;
			}
			query.captures(tree.rootNode).forEach((capture, index, array) => {
				if (!capture.name.endsWith('.name')) {
					return;
				}
				if (search.length === 0 || WorkspaceSymbolProvider._matchesFuzzy(search, capture.node.text)) {
					const symbol = new vscode.SymbolInformation(
						capture.node.text,
						vscode.SymbolKind.Struct,
						'',
						new vscode.Location(document.uri, asCodeRange(capture.node))
					);
					const containerCandidate = array[index - 1];
					if (capture.name.startsWith(containerCandidate.name)) {
						symbol.containerName = containerCandidate.name;
						symbol.kind = _symbolQueries.getSymbolKind(containerCandidate.name);
					}
					result.push(symbol);
				}
			});
		}
		sw.elapsed('WORKSPACE symbols');
		return result;
	}

	private static _matchesFuzzy(query: string, candidate: string) {
		if (query.length > candidate.length) {
			return false;
		}
		query = query.toLowerCase();
		candidate = candidate.toLowerCase();
		let queryPos = 0;
		let candidatePos = 0;
		while (queryPos < query.length && candidatePos < candidate.length) {
			if (query.charAt(queryPos) === candidate.charAt(candidatePos)) {
				queryPos++;
			}
			candidatePos++;
		}
		return queryPos === query.length;
	}
}
