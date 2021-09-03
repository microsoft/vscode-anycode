/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type Parser from '../../tree-sitter/tree-sitter';
import * as vscode from 'vscode';
import { ITrees, asCodeRange, StopWatch, isInteresting, IDocument, parallel } from '../common';
import { LRUMap } from "../util/lruMap";
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
import { Trie } from '../util/trie';
import { QueryCapture } from '../../tree-sitter/tree-sitter';

export const symbolMapping: {
	getSymbolKind(symbolKind: string, strict: boolean): vscode.SymbolKind | undefined;
	getSymbolKind(symbolKind: string): vscode.SymbolKind;
} = new class {
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

	getSymbolKind(symbolKind: string): vscode.SymbolKind;
	getSymbolKind(symbolKind: string, strict: true): vscode.SymbolKind | undefined;
	getSymbolKind(symbolKind: string, strict?: true): vscode.SymbolKind | undefined {
		const res = this._symbolKindMapping.get(symbolKind);
		if (!res && strict) {
			return undefined;
		}
		return res ?? vscode.SymbolKind.Variable;
	}
};

const _queries = new class {

	private readonly _data = new Map<string, string | Parser.Query>([
		['c', c.queries],
		['cpp', cpp.queries],
		['csharp', c_sharp.queries],
		['go', go.queries],
		['java', java.queries],
		['php', php.queries],
		['python', python.queries],
		['rust', rust.queries],
		['typescript', typescript.queries],
	]);

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
};

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

		if (size === 0) {
			// when truned off don't do the search run
			this.init = Promise.resolve();
		} else {
			this.init = Promise.resolve(vscode.workspace.findFiles(langPattern, undefined, 0).then(uris => {
				uris = uris.slice(0, size); // https://github.com/microsoft/vscode-remotehub/issues/255
				console.info(`FOUND ${uris.length} files for ${langPattern}`);
				uris.forEach(this._enqueue, this);
			}));
		}

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

export class Usage {
	constructor(
		readonly location: vscode.Location,
		readonly kind: vscode.SymbolKind | undefined
	) { }

	matches(kind: vscode.SymbolKind): boolean {
		return this.kind === undefined || this.kind === kind;
	}
}

export class SymbolIndex {

	readonly symbols: Trie<Set<vscode.SymbolInformation>> = Trie.create();
	readonly usages: Trie<Set<Usage>> = Trie.create();

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
		const uris = this._queue.consume();
		if (uris.length > 0) {
			const sw = new StopWatch();
			const remove = new Set(uris.map(u => u.toString()));

			// symbols
			for (const [key, value] of this.symbols) {
				for (let item of value) {
					if (remove.has(item.location.uri.toString())) {
						value.delete(item);
					}
				}
				if (value.size === 0) {
					this.symbols.delete(key);
				}
			}

			// usages
			for (const [key, value] of this.usages) {
				for (let item of value) {
					if (remove.has(item.location.uri.toString())) {
						value.delete(item);
					}
				}
				if (value.size === 0) {
					this.usages.delete(key);
				}
			}
			sw.elapsed(`INDEX REMOVED with ${uris.length} files`);

			sw.reset();
			const tasks = uris.map(this._createIndexTask, this);
			await parallel(tasks, 50, new vscode.CancellationTokenSource().token);
			sw.elapsed(`INDEX ADDED with ${uris.length} files, symbols: ${this.symbols.size}, usages: ${this.usages.size}`);
		}
	}

	private _createIndexTask(uri: vscode.Uri) {
		return async (token: vscode.CancellationToken) => {
			const document = await this._queue.getOrLoadDocument(uri);
			await this._doIndex(document, token);
		};
	}

	private async _doIndex(document: IDocument, token: vscode.CancellationToken): Promise<void> {
		const tree = await this._trees.getParseTree(document, token);
		if (!tree) {
			return;
		}

		// symbols
		const query = _queries.get(document.languageId, tree.getLanguage());
		if (!query) {
			return;
		}

		const captures = query.captures(tree.rootNode);

		// --- symbols

		for (let i = 0; i < captures.length; i++) {
			const capture = captures[i];
			if (!capture.name.startsWith('symbol.') || !capture.name.endsWith('.name')) {
				continue;
			}
			const symbol = new vscode.SymbolInformation(
				capture.node.text,
				vscode.SymbolKind.Struct,
				'',
				new vscode.Location(document.uri, asCodeRange(capture.node))
			);
			const containerCandidate = captures[i - 1];
			if (containerCandidate && capture.name.startsWith(containerCandidate.name)) {
				symbol.containerName = containerCandidate.name;
				symbol.kind = symbolMapping.getSymbolKind(containerCandidate.name);
			}
			if (capture.name.endsWith('.name')) {
				const containerCandidate = captures[i - 1];
				if (containerCandidate && capture.name.startsWith(containerCandidate.name)) {
					symbol.containerName = containerCandidate.name;
					symbol.kind = symbolMapping.getSymbolKind(containerCandidate.name);
				}
				let all = this.symbols.get(capture.node.text);
				if (!all) {
					this.symbols.set(capture.node.text, new Set([symbol]));
				} else {
					all.add(symbol);
				}
			}
		}

		// --- usages

		for (let i = 0; i < captures.length; i++) {
			const capture = captures[i];
			if (!capture.name.startsWith('usage.')) {
				continue;
			}
			const idx = capture.name.lastIndexOf('.');
			const loc = new Usage(
				new vscode.Location(document.uri, asCodeRange(capture.node)),
				symbolMapping.getSymbolKind(capture.name.substring(idx + 1), true)
			);
			let all = this.usages.get(capture.node.text);
			if (!all) {
				this.usages.set(capture.node.text, new Set([loc]));
			} else {
				all.add(loc);
			}
		}
	}

	//

	async symbolCaptures(document: IDocument, token: vscode.CancellationToken): Promise<Parser.QueryCapture[]> {
		const tree = await this._trees.getParseTree(document, token);
		if (!tree) {
			return [];
		}
		const query = _queries.get(document.languageId, tree.getLanguage());
		if (!query) {
			return [];
		}
		return query.captures(tree.rootNode).filter(item => item.name.startsWith('symbol.'));
	}
}
