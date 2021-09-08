/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { asCodeRange, StopWatch, parallel, isInteresting, symbolMapping } from '../common';
import { Trie } from '../util/trie';
import { CancellationTokenSource, Location, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { Trees } from '../trees';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentStore } from '../documentStore';
import { Queries, QueryType } from '../queries';

export class Usage {
	constructor(
		readonly location: Location,
		readonly kind: SymbolKind | undefined
	) { }

	matches(kind: SymbolKind): boolean {
		return this.kind === undefined || this.kind === kind;
	}
}

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

	readonly symbols: Trie<Set<SymbolInformation>> = Trie.create();
	readonly usages: Trie<Set<Usage>> = Trie.create();

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
		await parallel(tasks, 50, new CancellationTokenSource().token);
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
		// symbols

		const tree = this._trees.getParseTree(document);
		if (!tree) {
			return;
		}
		const query = Queries.get(document.languageId, 'documentSymbols', 'usages');
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
			;

			const symbol = SymbolInformation.create(
				capture.node.text,
				SymbolKind.Struct,
				asCodeRange(capture.node),
				document.uri
			);
			const containerCandidate = captures[i - 1];
			if (containerCandidate && capture.name.startsWith(containerCandidate.name)) {
				// symbol.containerName = containerCandidate.name;
				symbol.kind = symbolMapping.getSymbolKind(containerCandidate.name);
			}
			if (capture.name.endsWith('.name')) {
				const containerCandidate = captures[i - 1];
				if (containerCandidate && capture.name.startsWith(containerCandidate.name)) {
					// symbol.containerName = containerCandidate.name;
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
				Location.create(document.uri, asCodeRange(capture.node)),
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
}
