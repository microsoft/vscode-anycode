/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Parser } from '../../tree-sitter/tree-sitter';
import * as vscode from 'vscode';
import { ITrees, asCodeRange, StopWatch, isInteresting, matchesFuzzy, IDocument } from '../common';

import * as typescript from '../queries/typescript';
import * as php from '../queries/php';
import * as python from '../queries/python';
import * as java from '../queries/java';
import * as c from '../queries/c';
import * as cpp from '../queries/cpp';
import * as c_sharp from '../queries/c_sharp';
import * as go from '../queries/go';
import * as rust from '../queries/rust';


const _symbolQueries = new class {

	private readonly _data = new Map<string, string | Parser.Query>([
		['typescript', typescript.symbols],
		['php', php.symbols],
		['python', python.symbols],
		['java', java.symbols],
		['c', c.symbols],
		['cpp', cpp.symbols],
		['csharp', c_sharp.symbols],
		['go', go.symbols],
		['rust', rust.symbols],
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

	get(languageId: string, language: Parser.Language): Parser.Query | undefined {
		let queryOrStr = this._data.get(languageId);
		if (typeof queryOrStr === 'string') {
			try {
				queryOrStr = language.query(queryOrStr);
				this._data.set(languageId, queryOrStr);
			} catch (e) {
				console.log(languageId, e);
				this._data.delete(languageId);
				queryOrStr = undefined;
			}
		}
		return queryOrStr;
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

		const query = _symbolQueries.get(document.languageId, tree.getLanguage());
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

export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {

	private _index?: Promise<WorkspaceIndex>;

	constructor(private _trees: ITrees) { }

	register(): vscode.Disposable {
		return vscode.languages.registerWorkspaceSymbolProvider(this);
	}

	async provideWorkspaceSymbols(search: string, token: vscode.CancellationToken) {

		const result: vscode.SymbolInformation[] = [];
		type Config = 'off' | 'workspace' | 'documents';
		const value = vscode.workspace.getConfiguration('anycode').get<Config>('workspaceSymbols');

		if (value === 'off') {
			return result;
		}

		// when enabled always search inside open text documents
		const sw = new StopWatch();
		for (const document of vscode.workspace.textDocuments) {
			await this._collectMatches(search, document, token, result);
			if (token.isCancellationRequested) {
				return undefined;
			}
		}
		sw.elapsed('DOCUMENT symbol search');

		// experimental: use file index and search the whole workspace
		if (value === 'workspace') {
			sw.reset();
			await this._findWithIndex(search, result, token);
			sw.elapsed('WORKSPACE symbol search');
		}

		return result;
	}

	private async _collectMatches(search: string, document: IDocument, token: vscode.CancellationToken, bucket: vscode.SymbolInformation[]) {
		if (!isInteresting(document) || !_symbolQueries.isSupported(document.languageId)) {
			return;
		}
		const tree = await this._trees.getParseTree(document, token);
		if (!tree) {
			return;
		}
		const query = _symbolQueries.get(document.languageId, tree.getLanguage());
		if (!query) {
			return;
		}
		query.captures(tree.rootNode).forEach((capture, index, array) => {
			if (!capture.name.endsWith('.name')) {
				return;
			}
			if (search.length === 0 || matchesFuzzy(search, capture.node.text)) {
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
				bucket.push(symbol);
			}
		});
	}

	private async _findWithIndex(search: string, bucket: vscode.SymbolInformation[], token: vscode.CancellationToken) {
		// make regex from search characters: min 1 word-only character
		if (!/\w{1,}/.test(search)) {
			return;
		}
		let regexp!: RegExp;
		try {
			const fuzzyCharacters = search.split('').map(ch => `${ch}\\w*`);
			const pattern = `(^|[\\s_-])${fuzzyCharacters.join('')}`;
			regexp = new RegExp(pattern, 'i');
		} catch {
			// ignore
		}
		if (!regexp) {
			return;
		}

		// find all files, precheck with regexp, then collect symbols
		this._index = this._index ?? WorkspaceIndex.create();

		const chunkSize = 50;
		const allUris = (await this._index).all();
		for (let i = 0; i < allUris.length; i += chunkSize) {
			if (token.isCancellationRequested) {
				return;
			}
			const chunk = allUris.slice(i, i + chunkSize);
			const promises = chunk.map(async entry => {
				const source = await entry.load();
				if (!regexp.test(source)) {
					return;
				}
				let languageId = '';
				for (let [key, value] of WorkspaceIndex.languageMapping) {
					if (value.some(suffix => entry.uri.path.endsWith(`.${suffix}`))) {
						languageId = key;
						break;
					}
				}
				await this._collectMatches(search, {
					version: 1,
					uri: entry.uri,
					languageId,
					getText() { return source; },
				}, token, bucket);
			});

			await Promise.all(promises);
		}
	}
}

abstract class WorkspaceIndex {

	// we should have API for this...
	static languageMapping = new Map<string, string[]>([
		['typescript', ['ts', 'tsx']],
		['php', ['php', 'php4', 'php5', 'phtml', 'ctp']],
		['python', ['py', 'rpy', 'pyw', 'cpy', 'gyp', 'gypi', 'pyi', 'ipy',]],
		['go', ['go']],
		['java', ['java']],
		['c', ['c', 'i']],
		['cpp', ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hh', 'hxx', 'h++', 'h', 'ii', 'ino', 'inl', 'ipp', 'ixx', 'hpp.in', 'h.in']],
		['csharp', ['cs']],
		['rust', ['rs']],
	]);

	abstract all(): { uri: vscode.Uri, load(): Promise<string> }[];
	abstract dispose(): void;

	static async create(): Promise<WorkspaceIndex> {
		const sw = new StopWatch();
		const pattern = `**/*.{${Array.from(WorkspaceIndex.languageMapping.values()).flat().join(',')}}`;

		const uris = await vscode.workspace.findFiles(pattern, undefined, 1500);

		class Entry {
			constructor(readonly uri: vscode.Uri) { }
			private _text: string | undefined;

			async load() {
				if (!this._text) {
					const stat = await vscode.workspace.fs.stat(this.uri);
					if (stat.size > 1024 ** 2) {
						// too large...
						this._text = '';
					} else {
						this._text = new TextDecoder().decode(await vscode.workspace.fs.readFile(this.uri));
					}
				}
				return this._text;
			}

			reset() {
				this._text = undefined;
			}
		}

		const all = new Map<string, Entry>();
		for (let uri of uris) {
			all.set(uri.toString(), new Entry(uri));
		}

		const watcher = vscode.workspace.createFileSystemWatcher(pattern);
		watcher.onDidDelete(uri => all.delete(uri.toString()));
		watcher.onDidCreate(uri => all.set(uri.toString(), new Entry(uri)));
		watcher.onDidChange(uri => all.get(uri.toString())?.reset());
		sw.elapsed('INDEX created');
		return {
			all() {
				const exclude = new Set<string>();
				vscode.workspace.textDocuments.forEach(doc => exclude.add(doc.uri.toString()));
				return Array.from(all.entries()).filter(entry => !exclude.has(entry[0])).map(entry => entry[1]);
			},
			dispose() {
				watcher.dispose();
			}
		};
	}
}
