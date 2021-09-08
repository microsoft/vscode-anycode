/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type Parser from '../../../tree-sitter/tree-sitter';
import { asCodeRange, StopWatch, parallel, isInteresting } from '../common';
import * as c from '../queries/c';
import * as c_sharp from '../queries/c_sharp';
import * as cpp from '../queries/cpp';
import * as go from '../queries/go';
import * as java from '../queries/java';
import * as php from '../queries/php';
import * as python from '../queries/python';
import * as rust from '../queries/rust';
import * as typescript from '../queries/typescript';
import { Trie } from '../util/trie';
import { CancellationTokenSource, Location, SymbolInformation, SymbolKind } from 'vscode-languageserver';
import { Trees } from '../trees';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DocumentStore } from '../documentStore';

export const symbolMapping: {
	getSymbolKind(symbolKind: string, strict: boolean): SymbolKind | undefined;
	getSymbolKind(symbolKind: string): SymbolKind;
} = new class {
	private readonly _symbolKindMapping = new Map<string, SymbolKind>([
		['file', SymbolKind.File],
		['module', SymbolKind.Module],
		['namespace', SymbolKind.Namespace],
		['package', SymbolKind.Package],
		['class', SymbolKind.Class],
		['method', SymbolKind.Method],
		['property', SymbolKind.Property],
		['field', SymbolKind.Field],
		['constructor', SymbolKind.Constructor],
		['enum', SymbolKind.Enum],
		['interface', SymbolKind.Interface],
		['function', SymbolKind.Function],
		['variable', SymbolKind.Variable],
		['constant', SymbolKind.Constant],
		['string', SymbolKind.String],
		['number', SymbolKind.Number],
		['boolean', SymbolKind.Boolean],
		['array', SymbolKind.Array],
		['object', SymbolKind.Object],
		['key', SymbolKind.Key],
		['null', SymbolKind.Null],
		['enumMember', SymbolKind.EnumMember],
		['struct', SymbolKind.Struct],
		['event', SymbolKind.Event],
		['operator', SymbolKind.Operator],
		['typeParameter', SymbolKind.TypeParameter],
	]);

	getSymbolKind(symbolKind: string): SymbolKind;
	getSymbolKind(symbolKind: string, strict: true): SymbolKind | undefined;
	getSymbolKind(symbolKind: string, strict?: true): SymbolKind | undefined {

		if (symbolKind.startsWith('symbol.')) {
			symbolKind = symbolKind.substring(7);
		}

		const res = this._symbolKindMapping.get(symbolKind);
		if (!res && strict) {
			return undefined;
		}
		return res ?? SymbolKind.Variable;
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

		const tree = await this._trees.getParseTree(document);
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

	//

	async symbolCaptures(document: TextDocument): Promise<Parser.QueryCapture[]> {
		let tree: Parser.Tree;
		try {
			tree = await this._trees.getParseTree(document);
		} catch {
			return [];
		}
		const query = _queries.get(document.languageId, tree.getLanguage());
		if (!query) {
			return [];
		}
		return query.captures(tree.rootNode).filter(item => item.name.startsWith('symbol.'));
	}
}
