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
import { Outline } from './documentSymbols';

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

	readonly definitions: Trie<Set<lsp.SymbolInformation>> = Trie.create();
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
		for (const [key, value] of this.definitions) {
			for (let item of value) {
				if (remove.has(item.location.uri.toString())) {
					value.delete(item);
				}
			}
			if (value.size === 0) {
				this.definitions.delete(key);
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
		sw.elapsed(`INDEX ADDED with ${uris.length} files, symbols: ${this.definitions.size}, usages: ${this.usages.size}`);
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
				let all = this.definitions.get(info.name);
				if (!all) {
					this.definitions.set(info.name, new Set([info]));
				} else {
					all.add(info);
				}
				if (symbol.children) {
					walkSymbols(symbol.children, symbol);
				}
			}
		};
		walkSymbols(symbols, undefined);

		// (2) Use usage-queries to feed the global index of usages.
		// todo@jrieken
	}
}
