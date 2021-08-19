/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Parser } from '../../tree-sitter/tree-sitter';
import * as vscode from 'vscode';
import { ITrees, asCodeRange, StopWatch, isInteresting, matchesFuzzy, IDocument, parallel, Trie, LRUMap } from '../common';
import * as c from '../queries/c';
import * as c_sharp from '../queries/c_sharp';
import * as cpp from '../queries/cpp';
import * as go from '../queries/go';
import * as java from '../queries/java';
import * as php from '../queries/php';
import * as python from '../queries/python';
import * as rust from '../queries/rust';
import * as typescript from '../queries/typescript';
import { SupportedLanguages } from '../supportedLanguages';

const _symbolQueries = new class {

	private readonly _data = new Map<string, string | Parser.Query>([
		['c', c.symbols],
		['cpp', cpp.symbols],
		['csharp', c_sharp.symbols],
		['go', go.symbols],
		['java', java.symbols],
		['php', php.symbols],
		['python', python.symbols],
		['rust', rust.symbols],
		['typescript', typescript.symbols],
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

// --- document symbols

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

// --- symbol search

class FileQueueAndDocuments {

	private readonly _queue = new Map<string, vscode.Uri>();
	private readonly _disposables: vscode.Disposable[] = [];

	private readonly _decoder = new TextDecoder();
	private readonly _documentCache = new LRUMap<string, IDocument>(200);

	readonly init: Promise<void>;

	constructor(private _languages: SupportedLanguages, size: number) {

		const enqueueTextDocument = (document: vscode.TextDocument) => {
			if (vscode.languages.match(_languages.getSupportedLanguagesAsSelector(), document)) {
				this._enqueue(document.uri);
			}
		};
		vscode.workspace.textDocuments.forEach(enqueueTextDocument);
		this._disposables.push(vscode.workspace.onDidOpenTextDocument(enqueueTextDocument));
		this._disposables.push(vscode.workspace.onDidChangeTextDocument(e => enqueueTextDocument(e.document)));

		const langPattern = `**/*.{${Array.from(_languages.getSupportedLanguages().map(item => item.suffixes)).flat().join(',')}}`;

		this.init = Promise.resolve(vscode.workspace.findFiles(langPattern, undefined, size).then(uris => {
			uris.forEach(this._enqueue, this);
		}));

		const watcher = vscode.workspace.createFileSystemWatcher(langPattern);
		this._disposables.push(watcher);
		this._disposables.push(watcher.onDidCreate(this._enqueue, this));
		this._disposables.push(watcher.onDidDelete(uri => {
			this._queue.delete(uri.toString());
			this._documentCache.delete(uri.toString());
		}));
		this._disposables.push(watcher.onDidChange(uri => {
			this._enqueue(uri);
			this._documentCache.delete(uri.toString());
		}));
	}

	dispose() {
		this._disposables.forEach(d => d.dispose());
		this._queue.clear();
	}

	// --- queue stuff

	private _enqueue(uri: vscode.Uri): void {
		if (!isInteresting(uri)) {
			return;
		}
		if (!this._queue.has(uri.toString())) {
			this._queue.set(uri.toString(), uri);
		}
	}

	consume(): vscode.Uri[] {
		const result = Array.from(this._queue.values());
		this._queue.clear();
		return result;
	}

	// --- documents

	async getOrLoadDocument(uri: vscode.Uri): Promise<IDocument> {
		let doc: IDocument | undefined = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
		if (!doc) {
			// not open
			doc = await this._loadDocumentWithCache(uri);
		}
		return doc;
	}

	private async _loadDocumentWithCache(uri: vscode.Uri): Promise<IDocument> {
		let doc = this._documentCache.get(uri.toString());
		if (!doc) {
			doc = await this._loadDocument(uri);
			this._documentCache.set(uri.toString(), doc);
			this._documentCache.cleanup();
		}
		return doc;
	}

	private async _loadDocument(uri: vscode.Uri): Promise<IDocument> {
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.size > 1024 ** 2) {
			// too large...
			return {
				uri,
				version: 0,
				languageId: '',
				getText: () => ''
			};
		}

		const text = this._decoder.decode(await vscode.workspace.fs.readFile(uri));
		let languageId = '';
		for (let item of this._languages.getSupportedLanguages()) {
			if (item.suffixes.some(suffix => uri.path.endsWith(`.${suffix}`))) {
				languageId = item.languageId;
				break;
			}
		}

		return {
			uri,
			version: 1,
			languageId,
			getText: () => text
		};
	}
}


export class SymbolIndex {

	readonly trie: Trie<Map<string, vscode.Uri>> = new Trie<Map<string, vscode.Uri>>('', undefined);

	private readonly _queue: FileQueueAndDocuments;
	private _currentUpdate: Promise<void> | undefined;

	constructor(private readonly _trees: ITrees, languages: SupportedLanguages) {
		const size = Math.max(0, vscode.workspace.getConfiguration('anycode').get<number>('symbolIndexSize', 500));
		this._queue = new FileQueueAndDocuments(languages, size);
	}

	dispose(): void {
		this._queue.dispose();
	}

	get init() {
		return this._queue.init;
	}

	get documents(): { getOrLoadDocument(uri: vscode.Uri): Promise<IDocument> } {
		return this._queue;
	}

	async update(): Promise<void> {
		await this._currentUpdate;
		this._currentUpdate = this._doUpdate();
		return this._currentUpdate;
	}

	private async _doUpdate(): Promise<void> {
		const sw = new StopWatch();
		const uris = this._queue.consume();
		if (uris.length > 0) {
			const tasks = uris.map(this._createIndexTask, this);
			await parallel(tasks, 50, new vscode.CancellationTokenSource().token);
		}
		sw.elapsed(`INDEX done with ${uris.length} files`);
	}

	private _createIndexTask(uri: vscode.Uri) {
		return async (token: vscode.CancellationToken) => {
			const document = await this._queue.getOrLoadDocument(uri);

			const tree = await this._trees.getParseTree(document, token);
			if (!tree) {
				return;
			}

			const query = _symbolQueries.get(document.languageId, tree.getLanguage());
			if (!query) {
				return;
			}

			for (let capture of query.captures(tree.rootNode)) {
				if (capture.name.endsWith('.name')) {
					let map = this.trie.get(capture.node.text);
					if (!map) {
						map = new Map();
						this.trie.set(capture.node.text, map);
					}
					map.set(document.uri.toString(), document.uri);
				}
			}
		};
	}

	//

	async symbolCaptures(document: IDocument, token: vscode.CancellationToken): Promise<Parser.QueryCapture[]> {
		if (!_symbolQueries.isSupported(document.languageId)) {
			return [];
		}
		const tree = await this._trees.getParseTree(document, token);
		if (!tree) {
			return [];
		}
		const query = _symbolQueries.get(document.languageId, tree.getLanguage());
		if (!query) {
			return [];
		}
		return query.captures(tree.rootNode);
	}
}

export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {

	constructor(private _symbols: SymbolIndex) { }

	register(): vscode.Disposable {
		return vscode.languages.registerWorkspaceSymbolProvider(this);
	}

	async provideWorkspaceSymbols(search: string, token: vscode.CancellationToken) {

		const result: vscode.SymbolInformation[] = [];

		// always search in open documents
		const seen = new Set<string>();
		const sw = new StopWatch();
		await this._symbols.update();
		const all = this._symbols.trie.query(Array.from(search));
		const promises: Promise<any>[] = [];

		for (let map of all) {
			for (let [key, uri] of map) {
				if (!seen.has(key)) {
					promises.push(this._collectSymbolsWithMatchingName(search, uri, token, result));
					seen.add(key);
				}
			}
		}
		await Promise.all(promises);
		sw.elapsed('WORKSPACE symbol search');

		return result;
	}

	private async _collectSymbolsWithMatchingName(search: string, uri: vscode.Uri, token: vscode.CancellationToken, bucket: vscode.SymbolInformation[]) {

		const document = await this._symbols.documents.getOrLoadDocument(uri);
		const captures = await this._symbols.symbolCaptures(document, token);
		captures.forEach((capture, index, array) => {
			if (!capture.name.endsWith('.name')) {
				return;
			}
			if (matchesFuzzy(search, capture.node.text)) {
				const symbol = new vscode.SymbolInformation(
					capture.node.text,
					vscode.SymbolKind.Struct,
					'',
					new vscode.Location(document.uri, asCodeRange(capture.node))
				);
				const containerCandidate = array[index - 1];
				if (containerCandidate && capture.name.startsWith(containerCandidate.name)) {
					symbol.containerName = containerCandidate.name;
					symbol.kind = _symbolQueries.getSymbolKind(containerCandidate.name);
				}
				bucket.push(symbol);
			}
		});
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
		const all = this._symbols.trie.get(text);
		if (!all) {
			return [];
		}
		const promises: Promise<any>[] = [];
		for (const [, uri] of all) {
			promises.push(this._collectSymbolsWithSameName(text, document.languageId, uri, token, result));

		}
		await Promise.all(promises);
		return result;
	}

	private async _collectSymbolsWithSameName(name: string, language: string, uri: vscode.Uri, token: vscode.CancellationToken, bucket: vscode.Location[]) {
		const document = await this._symbols.documents.getOrLoadDocument(uri);
		if (document.languageId !== language) {
			return;
		}
		const captures = await this._symbols.symbolCaptures(document, token);
		for (let capture of captures) {
			if (capture.name.endsWith('.name') && capture.node.text === name) {
				bucket.push(new vscode.Location(document.uri, asCodeRange(capture.node)));
			}
		}
	}
}
