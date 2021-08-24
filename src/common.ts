/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Parser } from '../tree-sitter/tree-sitter';
import * as vscode from 'vscode';

export interface IDocument {
	uri: vscode.Uri,
	version: number;
	languageId: string;
	getText(): string;
}

export interface ITrees {
	supportedLanguages: readonly string[];
	getParseTree(document: IDocument, token: vscode.CancellationToken): Promise<Parser.Tree | undefined>;
	getLanguage(langId: string): Promise<Parser.Language | undefined>
}

export function asCodeRange(node: Parser.SyntaxNode): vscode.Range {
	return new vscode.Range(node.startPosition.row, node.startPosition.column, node.endPosition.row, node.endPosition.column);
}

export function asTsPoint(position: vscode.Position): Parser.Point {
	return {
		row: position.line,
		column: position.character
	};
}

export class StopWatch {
	private t1: number = Date.now();

	reset() {
		this.t1 = Date.now();
	}
	elapsed(msg: string) {
		const du = Date.now() - this.t1;
		console.info(`${msg}, ${du}ms`);
	}
}

const _disabledSchemes = new Set(['git', 'github', 'vsls']);

export function isInteresting(uri: vscode.Uri): boolean {
	return !_disabledSchemes.has(uri.scheme);
}

export async function parallel<R>(tasks: ((token: vscode.CancellationToken) => Promise<R>)[], degree: number, token: vscode.CancellationToken): Promise<R[]> {
	let result: R[] = [];
	let pos = 0;
	while (true) {
		if (token.isCancellationRequested) {
			throw new Error('cancelled');
		}
		const partTasks = tasks.slice(pos, pos + degree);
		if (partTasks.length === 0) {
			break;
		}
		const partResult = await Promise.all(partTasks.map(task => task(token)));
		pos += degree;
		result.push(...partResult);
	}
	return result;
}

// --- ghetto LRU that utilizes the fact that Map keeps things in insertion order

export class LRUMap<K, V> extends Map<K, V> {

	private readonly _cacheLimits = { max: 45, size: 30 };

	constructor(size: number = 30) {
		super();
		this._cacheLimits = { size, max: Math.round(size * 1.3) };
	}

	get(key: K): V | undefined {
		if (!this.has(key)) {
			return undefined;
		}
		const result = super.get(key);
		this.delete(key);
		this.set(key, result!);
		return result;
	}

	cleanup(): [K, V][] {
		if (this.size < this._cacheLimits.max) {
			return [];
		}
		const result = Array.from(this.entries()).slice(0, this._cacheLimits.size);
		for (let [key] of result) {
			this.delete(key);
		}
		return result;
	}
}


// --- trie

class Entry<E> {
	constructor(readonly key: string, public value: E) { }
}

export class Trie<E> {

	private readonly _children = new Map<string, Trie<E>>();

	constructor(readonly ch: string, public element: Entry<E> | undefined) { }

	set(str: string, element: E): void {
		let chars = Array.from(str);
		let node: Trie<E> = this;
		for (let pos = 0; pos < chars.length; pos++) {
			const ch = chars[pos];
			let child = node._children.get(ch);
			if (!child) {
				child = new Trie<E>(ch, undefined);
				node._children.set(ch, child);
			}
			node = child;
		}
		node.element = new Entry(str, element);
	}

	get(str: string): E | undefined {
		let chars = Array.from(str);
		let node: Trie<E> = this;
		for (let pos = 0; pos < chars.length; pos++) {
			const ch = chars[pos];
			let child = node._children.get(ch);
			if (!child) {
				return undefined;
			}
			node = child;
		}
		return node.element?.value;
	}

	delete(str: string): void {
		let chars = Array.from(str);
		let node: Trie<E> = this;
		let path: [string, Trie<E>][] = [];
		for (let pos = 0; pos < chars.length; pos++) {
			const ch = chars[pos];
			let child = node._children.get(ch);
			if (!child) {
				return undefined;
			}
			path.push([ch, node]);
			node = child;
		}

		// unset element
		node.element = undefined;

		// cleanup parents
		while (node._children.size === 0 && !node.element) {
			// parent
			const tuple = path.pop()!;
			tuple[1]._children.delete(tuple[0]);
			node = tuple[1];
		}
	}

	*query(str: string[]): IterableIterator<[string, E]> {
		let bucket: IterableIterator<[string, E]>[] = [];
		this._query(str, 0, bucket);
		for (let item of bucket) {
			yield* item;
		}
	}

	private _query(str: string[], pos: number, bucket: IterableIterator<[string, E]>[]) {
		if (pos >= str.length) {
			bucket.push(this._entries());
			return;
		}
		for (let [ch, child] of this._children) {
			if (ch === str[pos]) {
				child._query(str, pos + 1, bucket);
			}

			// todo@jrieken - stop when string is longer than children-depth
			// only proceed if the first character has matched
			if (pos > 0) {
				child._query(str, pos, bucket);
			}
		}
	}

	private *_entries(): IterableIterator<[string, E]> {
		if (this.element) {
			yield [this.element.key, this.element.value];
		}
		for (let child of this._children.values()) {
			yield* child._entries();
		}
	}

	[Symbol.iterator](): IterableIterator<[string, E]> {
		return this._entries();
	}
}
