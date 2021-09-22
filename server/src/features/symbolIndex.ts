/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { StopWatch, parallel, isInteresting, asLspRange } from '../common';
import { ReadonlyTrie, Trie } from '../util/trie';
import { Trees } from '../trees';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentStore } from '../documentStore';
import { Outline } from './documentSymbols';
import Languages from '../languages';

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

	delete(uri: string): boolean {
		const callbacks = this._cleanup.get(uri);
		if (callbacks) {
			callbacks.forEach(fn => fn());
			this._cleanup.delete(uri);
			return true;
		}
		return false;
	}

	toString(): string {
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
			const delCount = uris.map(this._cache.delete, this._cache).filter(Boolean).length;
			sw.elapsed(`INDEX REMOVED: ${delCount} files`);

			// schedule a new task to update the cache for`
			// changed uris
			sw.reset();
			const tasks = uris.map(this._createIndexTask, this);
			const stats = await parallel(tasks, 50, new lsp.CancellationTokenSource().token);

			let totalRetrieve = 0;
			let totalIndex = 0;
			for (let stat of stats) {
				totalRetrieve += stat.durationRetrieve;
				totalIndex += stat.durationIndex;
			}

			sw.elapsed(`INDEX ADDED:  ${uris.length} files, stats: ${this._cache.toString()}, total_retrieve: ${Math.round(totalRetrieve)}ms, total_index: ${Math.round(totalIndex)}ms`);
		}
	}

	private _createIndexTask(uri: string): () => Promise<{ durationRetrieve: number, durationIndex: number }> {
		return async () => {
			const _t1Retrieve = performance.now();
			const document = await this._documents.retrieve(uri);
			const durationRetrieve = performance.now() - _t1Retrieve;

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
		const tree = this._trees.getParseTree(document);
		if (tree) {
			const query = Languages.getQuery(document.languageId, 'references');
			const captures = query.captures(tree.rootNode);

			for (let capture of captures) {
				const usage = lsp.Location.create(document.uri, asLspRange(capture.node));
				this._cache.insertUsage(capture.node.text, usage);
			}
		}
	}
}
