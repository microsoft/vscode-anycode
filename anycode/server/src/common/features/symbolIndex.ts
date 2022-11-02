/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { isInteresting, parallel, StopWatch } from '../common';
import { DocumentStore } from '../documentStore';
import { Trees } from '../trees';
import { Trie } from '../util/trie';
import { getDocumentSymbols } from './documentSymbols';
import { getDocumentUsages, IUsage } from './references';

class Queue {

	private readonly _queue = new Set<string>();

	enqueue(uri: string): void {
		if (isInteresting(uri) && !this._queue.has(uri)) {
			this._queue.add(uri);
		}
	}

	dequeue(uri: string): void {
		this._queue.delete(uri);
	}

	consume(n: number | undefined, filter: (uri: string) => boolean): string[] {
		if (n === undefined) {
			n = this._queue.size;
		}
		const result: string[] = [];
		for (const uri of this._queue) {
			if (!filter(uri)) {
				continue;
			}
			this._queue.delete(uri);
			if (result.push(uri) >= n) {
				break;
			}
		}
		return result;
	}
}

export interface SymbolInfoStorage {
	insert(uri: string, info: Map<string, SymbolInfo>): void;
	getAll(): Promise<Map<string, Map<string, SymbolInfo>>>;
	delete(uris: Set<string>): Promise<void>;
}

export class MemorySymbolStorage implements SymbolInfoStorage {

	private readonly _map = new Map<string, Map<string, SymbolInfo>>();

	insert(uri: string, info: Map<string, SymbolInfo>): void {
		this._map.set(uri, info);
	}

	async getAll(): Promise<Map<string, Map<string, SymbolInfo>>> {
		return this._map;
	}

	async delete(uris: Set<string>): Promise<void> {
		for (const uri of uris) {
			this._map.delete(uri);
		}
	}
}

export interface SymbolInfo {
	definitions: Set<lsp.SymbolKind>
	usages: Set<lsp.SymbolKind>
}

class Index {

	private readonly _index = Trie.create<Map<lsp.DocumentUri, SymbolInfo>>();
	private readonly _cleanup = new Map<lsp.DocumentUri, Function>();

	get(text: string) {
		return this._index.get(text);
	}

	query(query: string): IterableIterator<[string, Map<lsp.DocumentUri, SymbolInfo>]> {
		return this._index.query(Array.from(query));
	}

	[Symbol.iterator](): IterableIterator<[string, Map<lsp.DocumentUri, SymbolInfo>]> {
		return this._index[Symbol.iterator]();
	}

	update(uri: lsp.DocumentUri, value: Map<string, SymbolInfo>) {

		// (1) remove old symbol information
		this._cleanup.get(uri)?.();

		// (2) insert new symbol information
		for (const [name, kinds] of value) {
			const all = this._index.get(name);
			if (all) {
				all.set(uri, kinds);
			} else {
				this._index.set(name, new Map([[uri, kinds]]));
			}
		}

		// (3) register clean-up by uri
		this._cleanup.set(uri, () => {
			for (const name of value.keys()) {
				const all = this._index.get(name);
				if (all) {
					if (all.delete(uri) && all.size === 0) {
						this._index.delete(name);
					}
				}
			}
		});
	}

	delete(uri: lsp.DocumentUri): boolean {
		const cleanupFn = this._cleanup.get(uri);
		if (cleanupFn) {
			cleanupFn();
			this._cleanup.delete(uri);
			return true;
		}
		return false;
	}
}

class SuffixFilter {

	private _suffixes = new Set<string>();
	private _regex?: RegExp;

	accept(uri: string) {
		return Boolean(this._regex?.test(uri));
	}

	update(suffixes: string[]) {
		for (const item of suffixes) {
			this._suffixes.add(item);
		}
		this._regex = new RegExp(`\\.(${Array.from(this._suffixes).map(SuffixFilter._escapeRegExpCharacters).join('|')})`, 'i');
	}

	private static _escapeRegExpCharacters(value: string): string {
		return value.replace(/[\\\{\}\*\+\?\|\^\$\.\[\]\(\)]/g, '\\$&');
	}
}

export class SymbolIndex {

	readonly index = new Index();

	private readonly _syncQueue = new Queue();
	private readonly _asyncQueue = new Queue();
	private readonly _suffixFilter = new SuffixFilter();

	constructor(
		private readonly _trees: Trees,
		private readonly _documents: DocumentStore,
		private readonly _symbolInfoStorage: SymbolInfoStorage
	) { }

	addFile(uri: string): void {
		this._syncQueue.enqueue(uri);
		this._asyncQueue.dequeue(uri);
	}

	removeFile(uri: string): void {
		this._syncQueue.dequeue(uri);
		this._asyncQueue.dequeue(uri);
		this.index.delete(uri);
	}

	private _currentUpdate: Promise<void> | undefined;

	async update(): Promise<void> {
		await this._currentUpdate;
		const uris = this._syncQueue.consume(undefined, uri => this._suffixFilter.accept(uri));
		this._currentUpdate = this._doUpdate(uris, false);
		return this._currentUpdate;
	}

	private async _doUpdate(uris: string[], async: boolean): Promise<void> {
		if (uris.length !== 0) {

			// schedule a new task to update the cache for changed uris
			const sw = new StopWatch();
			const tasks = uris.map(this._createIndexTask, this);
			const stats = await parallel(tasks, 50, new lsp.CancellationTokenSource().token);

			let totalRetrieve = 0;
			let totalIndex = 0;
			for (let stat of stats) {
				totalRetrieve += stat.durationRetrieve;
				totalIndex += stat.durationIndex;
			}

			console.log(`[index] (${async ? 'async' : 'sync'}) added ${uris.length} files ${sw.elapsed()}ms (retrieval: ${Math.round(totalRetrieve)}ms, indexing: ${Math.round(totalIndex)}ms) (files: ${uris.map(String)})`);
		}
	}

	private _createIndexTask(uri: string): () => Promise<{ durationRetrieve: number, durationIndex: number }> {
		return async () => {
			// fetch document
			const _t1Retrieve = performance.now();
			const document = await this._documents.retrieve(uri);
			const durationRetrieve = performance.now() - _t1Retrieve;

			// remove current data
			this.index.delete(uri);

			// update index
			const _t1Index = performance.now();
			try {
				await this._doIndex(document);
			} catch (e) {
				console.log(`FAILED to index ${uri}`, e);
			}
			const durationIndex = performance.now() - _t1Index;

			return { durationRetrieve, durationIndex };
		};
	}

	private async _doIndex(document: TextDocument, symbols?: lsp.DocumentSymbol[], usages?: IUsage[]): Promise<void> {

		const symbolInfo = new Map<string, SymbolInfo>();

		// definitions
		if (!symbols) {
			symbols = await getDocumentSymbols(document, this._trees, true);
		}
		for (const symbol of symbols) {
			const all = symbolInfo.get(symbol.name);
			if (all) {
				all.definitions.add(symbol.kind);
			} else {
				symbolInfo.set(symbol.name, { definitions: new Set([symbol.kind]), usages: new Set() });
			}
		}

		// usages
		if (!usages) {
			usages = await getDocumentUsages(document, this._trees);
		}
		for (const usage of usages) {
			const all = symbolInfo.get(usage.name);
			if (all) {
				all.usages.add(usage.kind);
			} else {
				symbolInfo.set(usage.name, { definitions: new Set(), usages: new Set([usage.kind]) });
			}
		}

		// update in-memory index and persisted index
		this.index.update(document.uri, symbolInfo);
		this._symbolInfoStorage.insert(document.uri, symbolInfo);
	}

	async initFiles(_uris: string[]) {
		const uris = new Set(_uris);
		const sw = new StopWatch();

		console.log(`[index] initializing index for ${uris.size} files.`);
		const persisted = await this._symbolInfoStorage.getAll();
		const obsolete = new Set<string>();

		for (const [uri, data] of persisted) {
			if (!uris.delete(uri)) {
				// this file isn't requested anymore -> remove later
				obsolete.add(uri);

			} else {
				// restore definitions and usages and schedule async
				// update for this file
				this.index.update(uri, data);
				this._asyncQueue.enqueue(uri);
			}
		}

		for (const uri of uris) {
			// this file wasn't seen yet -> add now
			this.addFile(uri);
		}

		// remove from persisted cache files that aren't interesting anymore 
		await this._symbolInfoStorage.delete(obsolete);

		console.log(`[index] added FROM CACHE ${persisted.size} files ${sw.elapsed()}ms, all need revalidation, ${uris.size} files are NEW, ${obsolete.size} where OBSOLETE`);
	}

	async unleashFiles(suffixes: string[]) {

		this._suffixFilter.update(suffixes);

		await this.update();

		// async update all files that were taken from cache
		const asyncUpdate = async () => {
			const uris = this._asyncQueue.consume(70, uri => this._suffixFilter.accept(uri));
			if (uris.length === 0) {
				return;
			}
			const t1 = performance.now();
			await this._doUpdate(uris, true);
			setTimeout(() => asyncUpdate(), (performance.now() - t1) * 4);
		};
		asyncUpdate();
	}

	// ---

	async getDefinitions(ident: string, source: TextDocument) {

		await this.update();

		const result: lsp.SymbolInformation[] = [];
		let sameLanguageOffset = 0;

		const all = this.index.get(ident) ?? [];
		const work: Promise<any>[] = [];

		for (const [uri, value] of all) {

			if (value.definitions.size === 0) {
				// only usages
				continue;
			}

			work.push(this._documents.retrieve(uri).then(async document => {
				const isSameLanguage = source.languageId === document.languageId;
				const symbols = await getDocumentSymbols(document, this._trees, true);
				for (const item of symbols) {
					if (item.name === ident) {
						const info = lsp.SymbolInformation.create(item.name, item.kind, item.selectionRange, uri);
						if (isSameLanguage) {
							result.unshift(info);
							sameLanguageOffset++;
						} else {
							result.push(info);
						}
					}
				}

				// update index
				setTimeout(() => {
					this._asyncQueue.dequeue(document.uri);
					this._doIndex(document, symbols);
				});

			}).catch(err => {
				console.log(err);
			}));
		}

		await Promise.allSettled(work);

		// only return results that are of the same language unless there are only 
		// results from other languages
		return result.slice(0, sameLanguageOffset || undefined);
	}

	async getUsages(ident: string, source: TextDocument) {

		await this.update();

		const result: lsp.Location[] = [];

		const all = this.index.get(ident) ?? [];
		const work: Promise<any>[] = [];
		let sameLanguageOffset = 0;

		for (const [uri, value] of all) {

			if (value.usages.size === 0) {
				// only definitions
				continue;
			}

			work.push(this._documents.retrieve(uri).then(async document => {
				const isSameLanguage = source.languageId === document.languageId;
				const usages = await getDocumentUsages(document, this._trees);
				for (const item of usages) {
					if (item.name === ident) {
						const location = lsp.Location.create(uri, item.range);
						if (isSameLanguage) {
							result.unshift(location);
							sameLanguageOffset++;
						} else {
							result.push(location);
						}
					}
				}

				// update index
				setTimeout(() => {
					this._asyncQueue.dequeue(document.uri);
					this._doIndex(document, undefined, usages);
				});

			}).catch(err => {
				console.log(err);
			}));
		}

		await Promise.allSettled(work);

		// only return results that are of the same language unless there are only 
		// results from other languages
		return result.slice(0, sameLanguageOffset || undefined);
	}
}
