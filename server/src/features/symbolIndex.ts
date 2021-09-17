/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { StopWatch, parallel, isInteresting } from '../common';
import { ReadonlyTrie, Trie } from '../util/trie';
import { Trees } from '../trees';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentStore } from '../documentStore';
import { Outline } from './documentSymbols';

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

	consume(): string[] {
		const result = Array.from(this._queue.values());
		this._queue.clear();
		return result;
	}
}


class Cache {

	private readonly _definitions = Trie.create<Set<lsp.SymbolInformation>>();
	private readonly _usages = Trie.create<Set<lsp.Location>>();
	private readonly _cleanup = new Map<string, Function[]>();

	get definitions() {
		return this._definitions;
	}

	get usages() {
		return this._usages;
	}

	insertDefinition(text: string, definition: lsp.SymbolInformation): void {
		let all = this._definitions.get(text);
		if (all) {
			all.add(definition);
		} else {
			all = new Set([definition]);
			this._definitions.set(text, all);
		}
		this._addCleanup(definition.location.uri, () => {
			if (all!.delete(definition) && all!.size === 0) {
				this._definitions.delete(text);
			}
		});
	}

	insertUsage(text: string, usage: lsp.Location): void {
		let all = this._usages.get(text);
		if (all) {
			all.add(usage);
		} else {
			all = new Set([usage]);
			this._usages.set(text, all);
		}
		this._addCleanup(usage.uri, () => {
			if (all!.delete(usage) && all!.size === 0) {
				this._usages.delete(text);
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

	delete(uri: string): void {
		const callbacks = this._cleanup.get(uri);
		if (callbacks) {
			callbacks.forEach(fn => fn());
			this._cleanup.delete(uri);
		}
	}

	toString() {
		return `symbols: ${this._definitions.size}, usages: ${this._usages.size}`;
	}
}

export class SymbolIndex {

	private readonly _cache = new Cache();
	private readonly _queue = new Queue();

	constructor(
		private readonly _trees: Trees,
		private readonly _documents: DocumentStore
	) { }

	get definitions(): ReadonlyTrie<Set<lsp.SymbolInformation>> {
		return this._cache.definitions;
	}

	get usages(): ReadonlyTrie<Set<lsp.Location>> {
		return this._cache.usages;
	}

	addFile(uris: string[] | string): void {
		if (Array.isArray(uris)) {
			uris.forEach(this._queue.enqueue, this._queue);
		} else {
			this._queue.enqueue(uris);
		}
	}

	removeFile(uris: string[]): void {
		for (let uri of uris) {
			this._queue.dequeue(uri);
			this._cache.delete(uri);
		}
	}

	private _currentUpdate: Promise<void> | undefined;

	async update(): Promise<void> {
		await this._currentUpdate;
		this._currentUpdate = this._doUpdate();
		return this._currentUpdate;
	}

	private async _doUpdate(): Promise<void> {
		const uris = this._queue.consume();
		if (uris.length !== 0) {
			// clear cached info for changed uris
			const sw = new StopWatch();
			uris.forEach(this._cache.delete, this._cache);
			sw.elapsed(`INDEX REMOVED with ${uris.length} files`);

			// schedule a new task to update the cache for`
			// changed uris
			sw.reset();
			const tasks = uris.map(this._createIndexTask, this);
			await parallel(tasks, 50, new lsp.CancellationTokenSource().token);
			sw.elapsed(`INDEX ADDED with ${uris.length} files, stats: ${this._cache.toString()}`);
		}
	}

	private _createIndexTask(uri: string) {
		return async () => {
			const document = await this._documents.retrieve(uri);
			try {
				await this._doIndex(document);
			} catch (e) {
				console.log(`FAILED to index ${uri}`, e);
			}
		};
	}

	private async _doIndex(document: TextDocument): Promise<void> {

		// (1) use outline information to feed the global index of definitions
		const symbols = await Outline.create(document, this._trees);
		const walkSymbols = (symbols: lsp.DocumentSymbol[], parent: lsp.DocumentSymbol | undefined) => {

			for (let symbol of symbols) {
				const info = lsp.SymbolInformation.create(
					symbol.name,
					symbol.kind,
					symbol.selectionRange,
					document.uri,
					parent?.name
				);
				if (symbol.children) {
					walkSymbols(symbol.children, symbol);
				}
				this._cache.insertDefinition(info.name, info);
			}
		};
		walkSymbols(symbols, undefined);

		// (2) Use usage-queries to feed the global index of usages.
		// todo@jrieken
	}
}
