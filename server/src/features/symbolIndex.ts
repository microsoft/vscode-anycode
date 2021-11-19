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
import { getDocumentUsages } from './references';

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

	consume(n?: number): string[] {
		if (n === undefined) {
			const result = Array.from(this._queue.values());
			this._queue.clear();
			return result;
		}

		const result: string[] = [];
		const iter = this._queue.values();
		for (; n > 0; n--) {
			const r = iter.next();
			if (r.done) {
				break;
			}
			const uri = r.value;
			result.push(uri);
			this._queue.delete(uri);
		}
		return result;
	}
}


export class PersistedIndex {

	private readonly _version = 1;
	private readonly _store = 'definitionsAndUsages';
	private _db?: IDBDatabase;

	constructor(private readonly _name: string) { }

	async open() {

		if (this._db) {
			return;
		}

		await new Promise((resolve, reject) => {
			const request = indexedDB.open(this._name, this._version);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(this._store)) {
					console.error(`Error while opening IndexedDB. Could not find '${this._store}' object store`);
					return resolve(this._delete(db).then(() => this.open()));
				} else {
					resolve(undefined);
					this._db = db;
				}
			};
			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(this._store)) {
					db.createObjectStore(this._store);
				}
			};
		});
	}

	async close(): Promise<void> {
		if (this._db) {
			await this._bulkInsert();
			this._db.close();
		}
	}

	private _delete(db: IDBDatabase): Promise<void> {
		return new Promise((resolve, reject) => {
			// Close any opened connections
			db.close();

			// Delete the db
			const deleteRequest = indexedDB.deleteDatabase(this._name);
			deleteRequest.onerror = () => reject(deleteRequest.error);
			deleteRequest.onsuccess = () => resolve();
		});
	}

	private _insertQueue = new Map<string, { definitions: Map<string, Set<lsp.SymbolKind>>, usages: Map<string, Set<lsp.SymbolKind>> }>();
	private _insertHandle: any;

	insert(uri: string, definitions: Map<string, Set<lsp.SymbolKind>>, usages: Map<string, Set<lsp.SymbolKind>>) {
		this._insertQueue.set(uri, { definitions, usages });
		clearTimeout(this._insertHandle);
		this._insertHandle = setTimeout(() => {
			this._bulkInsert().catch(err => {
				console.error(err);
			});
		}, 50);
	}

	private async _bulkInsert(): Promise<void> {
		if (this._insertQueue.size === 0) {
			return;
		}
		if (!this._db) {
			throw new Error('invalid state');
		}
		const t = this._db.transaction(this._store, 'readwrite');
		const toInsert = new Map(this._insertQueue);
		this._insertQueue.clear();
		for (let [uri, data] of toInsert) {
			t.objectStore(this._store).put(data, uri);
		}
		return new Promise((resolve, reject) => {
			t.oncomplete = () => resolve(undefined);
			t.onerror = (err) => reject(err);
		});
	}

	getAll(): Promise<Map<string, { definitions: Map<string, Set<lsp.SymbolKind>>, usages: Map<string, Set<lsp.SymbolKind>> }>> {
		if (!this._db) {
			throw new Error('invalid state');
		}
		const entries = new Map<string, { definitions: Map<string, Set<lsp.SymbolKind>>, usages: Map<string, Set<lsp.SymbolKind>> }>();
		const t = this._db.transaction(this._store, 'readonly');

		return new Promise((resolve, reject) => {
			const store = t.objectStore(this._store);
			const cursor = store.openCursor();
			cursor.onsuccess = () => {
				if (!cursor.result) {
					resolve(entries);
					return;
				}
				entries.set(String(cursor.result.key), cursor.result.value);
				cursor.result.continue();
			};

			cursor.onerror = () => reject(cursor.error);
			t.onerror = () => reject(t.error);
		});
	}

	delete(uris: Set<string>) {
		if (!this._db) {
			throw new Error('invalid state');
		}
		const t = this._db.transaction(this._store, 'readwrite');
		const store = t.objectStore(this._store);

		for (const uri of uris) {
			const request = store.delete(uri);
			request.onerror = e => console.error(e);
		}
		return new Promise((resolve, reject) => {
			t.oncomplete = () => resolve(undefined);
			t.onerror = (err) => reject(err);
		});
	}
}

class Index {

	private readonly _index = Trie.create<Map<lsp.DocumentUri, Set<lsp.SymbolKind>>>();
	private readonly _cleanup = new Map<string, Function[]>();

	get(text: string) {
		return this._index.get(text);
	}

	query(query: string): IterableIterator<[string, Map<lsp.DocumentUri, Set<lsp.SymbolKind>>]> {
		return this._index.query(Array.from(query));
	}

	[Symbol.iterator](): IterableIterator<[string, Map<lsp.DocumentUri, Set<lsp.SymbolKind>>]> {
		return this._index[Symbol.iterator]();
	}

	update(uri: string, value: Map<string, Set<lsp.SymbolKind>>) {
		for (const [name, kinds] of value) {
			const all = this._index.get(name);
			if (all) {
				all.set(uri, kinds);
			} else {
				this._index.set(name, new Map([[uri, kinds]]));
			}
		}

		this._addCleanup(uri, () => {
			for (let [name] of value) {
				const all = this._index.get(name);
				if (all) {
					if (all.delete(uri) && all.size === 0) {
						this._index.delete(name);
					}
				}
			}
		});
	}

	private _addCleanup(uri: string, cleanupFn: () => void) {
		const arr = this._cleanup.get(uri);
		if (arr) {
			arr.push(cleanupFn);
		} else {
			this._cleanup.set(uri, [cleanupFn]);
		}
	}

	delete(uri: string): boolean {
		const callbacks = this._cleanup.get(uri);
		if (callbacks) {
			callbacks.forEach(fn => fn());
			this._cleanup.delete(uri);
			return true;
		}
		return false;
	}
}

export class SymbolIndex {

	readonly definitions = new Index();
	readonly usages = new Index();

	private readonly _syncQueue = new Queue();
	private readonly _asyncQueue = new Queue();

	constructor(
		private readonly _trees: Trees,
		private readonly _documents: DocumentStore,
		private readonly _persistedIndex: PersistedIndex
	) { }

	addFile(uri: string): void {
		this._syncQueue.enqueue(uri);
		this._asyncQueue.dequeue(uri);
	}

	removeFile(uri: string): void {
		this._syncQueue.dequeue(uri);
		this._asyncQueue.dequeue(uri);
		this.definitions.delete(uri);
		this.usages.delete(uri);
	}

	private _currentUpdate: Promise<void> | undefined;

	async update(): Promise<void> {
		await this._currentUpdate;
		this._currentUpdate = this._doUpdate(this._syncQueue.consume());
		return this._currentUpdate;
	}

	private async _doUpdate(uris: string[]): Promise<void> {
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

			console.log(`[index] added ${uris.length} files ${sw.elapsed()}ms\n\tretrieval: ${Math.round(totalRetrieve)}ms\n\tindexing: ${Math.round(totalIndex)}ms`);
			// console.log(`[usage] info: ${this._cache.toString()}`); // TODO@jrieken 
		}
	}

	private _createIndexTask(uri: string): () => Promise<{ durationRetrieve: number, durationIndex: number }> {
		return async () => {
			// fetch document
			const _t1Retrieve = performance.now();
			const document = await this._documents.retrieve(uri);
			const durationRetrieve = performance.now() - _t1Retrieve;

			// remove current data
			this.definitions.delete(uri);
			this.usages.delete(uri);

			// update index
			const _t1Index = performance.now();
			try {
				this._doIndex(document);
			} catch (e) {
				console.log(`FAILED to index ${uri}`, e);
			}
			const durationIndex = performance.now() - _t1Index;

			return { durationRetrieve, durationIndex };
		};
	}

	private _doIndex(document: TextDocument): void {

		const definitions = new Map<string, Set<lsp.SymbolKind>>();
		const usages = new Map<string, Set<lsp.SymbolKind>>();

		// (1) use outline information to feed the global index of definitions
		for (const symbol of getDocumentSymbols(document, this._trees, true)) {
			const all = definitions.get(symbol.name);
			if (all) {
				all.add(symbol.kind);
			} else {
				definitions.set(symbol.name, new Set([symbol.kind]));
			}
		}

		// (2) Use usage-queries to feed the global index of usages.
		for (let usage of getDocumentUsages(document, this._trees)) {
			const all = usages.get(usage.name);
			if (all) {
				all.add(usage.kind);
			} else {
				usages.set(usage.name, new Set([usage.kind]));
			}
		}

		// update in-memory index and persisted index
		this.definitions.update(document.uri, definitions);
		this.usages.update(document.uri, usages);
		this._persistedIndex.insert(document.uri, definitions, usages);
	}

	async initFiles(_uris: string[]) {
		const uris = new Set(_uris);
		const sw = new StopWatch();

		console.log(`[index] building index for ${uris.size} files.`);
		const persisted = await this._persistedIndex.getAll();
		const obsolete = new Set<string>();

		for (const [uri, data] of persisted) {
			if (!uris.delete(uri)) {
				// this file isn't requested anymore, remove later
				obsolete.add(uri);

			} else {
				// restore definitions and usages and schedule async
				// update for this file
				this.definitions.update(uri, data.definitions);
				this.usages.update(uri, data.usages);

				this._asyncQueue.enqueue(uri);
			}
		}
		console.log(`[index] added FROM CACHE ${persisted.size} files ${sw.elapsed()}ms\n\t${uris.size} files still need to be fetched\n\t${obsolete.size} files are obsolete in cache`);

		// sync update all files that were not cached
		uris.forEach(this.addFile, this);
		await this.update();

		// remove from persisted cache files that aren't interesting anymore 
		await this._persistedIndex.delete(obsolete);

		// async update all files that were taken from cache
		const asyncUpdate = async () => {
			const uris = this._asyncQueue.consume(100);
			if (uris.length > 0) {
				await this._doUpdate(uris);
				setTimeout(() => asyncUpdate(), 1000);
			}
		};
		asyncUpdate();
	}

	// ---

	async getDefinitions(ident: string, source: TextDocument) {

		await this.update();

		const result: lsp.SymbolInformation[] = [];
		let sameLanguageOffset = 0;

		const all = this.definitions.get(ident) ?? [];
		const work: Promise<any>[] = [];

		for (const [uri] of all) {
			work.push(this._documents.retrieve(uri).then(document => {
				const isSameLanguage = source.languageId === document.languageId;
				for (const item of getDocumentSymbols(document, this._trees, true)) {
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

				this._asyncQueue.dequeue(document.uri);
				this._doIndex(document);

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

		const all = this.usages.get(ident) ?? [];
		const work: Promise<any>[] = [];
		let sameLanguageOffset = 0;

		for (const [uri] of all) {
			work.push(this._documents.retrieve(uri).then(document => {
				const isSameLanguage = source.languageId === document.languageId;
				for (const item of getDocumentUsages(document, this._trees)) {
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

				this._asyncQueue.dequeue(document.uri);
				this._doIndex(document);

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
