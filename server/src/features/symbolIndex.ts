/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { StopWatch, parallel, isInteresting } from '../common';
import { Trie } from '../util/trie';
import { Trees } from '../trees';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentStore } from '../documentStore';
import { FileInfo } from './fileInfo';

class Queue {

	private readonly _queue = new Set<string>();

	enqueue(uri: string): void {
		if (isInteresting(uri) && !this._queue.has(uri)) {
			this._queue.add(uri);
		}
	}

	consume(): string[] {
		const result = Array.from(this._queue.values());
		this._queue.clear();
		return result;
	}
}

export class SymbolIndex {

	readonly symbols: Trie<Set<lsp.SymbolInformation>> = Trie.create();
	readonly usages: Trie<Set<lsp.Location>> = Trie.create();

	private readonly _queue = new Queue();
	private _currentUpdate: Promise<void> | undefined;

	constructor(
		private readonly _trees: Trees,
		private readonly _documents: DocumentStore
	) { }

	addFile(uris: string[] | string): void {
		if (Array.isArray(uris)) {
			uris.forEach(this._queue.enqueue, this._queue);
		} else {
			this._queue.enqueue(uris);
		}
	}

	removeFile(uris: string[]): void {
		// todo@jrieken
		// (1) remove from queue
		// (2) remove from tries
	}

	async update(): Promise<void> {
		await this._currentUpdate;
		this._currentUpdate = this._doUpdate();
		return this._currentUpdate;
	}

	private async _doUpdate(): Promise<void> {
		const uris = this._queue.consume();
		if (uris.length === 0) {
			return;
		}
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
				if (remove.has(item.uri.toString())) {
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
		await parallel(tasks, 50, new lsp.CancellationTokenSource().token);
		sw.elapsed(`INDEX ADDED with ${uris.length} files, symbols: ${this.symbols.size}, usages: ${this.usages.size}`);
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

		// build simple file info (single scope) and
		// store all symbols and usages into a project wide trie
		const info = FileInfo.simple(document, this._trees);

		for (let def of info.root.definitions()) {
			const symbol = lsp.SymbolInformation.create(
				def.name,
				lsp.SymbolKind.Struct,
				def.range,
				document.uri
			);
			let all = this.symbols.get(def.name);
			if (!all) {
				this.symbols.set(def.name, new Set([symbol]));
			} else {
				all.add(symbol);
			}
		}

		for (let usage of info.root.usages()) {
			const loc = lsp.Location.create(
				document.uri,
				usage.range
			);
			let all = this.usages.get(usage.name);
			if (!all) {
				this.usages.set(usage.name, new Set([loc]));
			} else {
				all.add(loc);
			}
		}
	}
}
