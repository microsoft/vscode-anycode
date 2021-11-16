/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


class Entry<E> {
	constructor(readonly key: string, public value: E) { }
}

export interface ReadonlyTrie<E> {
	size: number;
	get(str: string): E | undefined;
	query(str: string[]): IterableIterator<[string, E]>;
	[Symbol.iterator](): IterableIterator<[string, E]>;
}

export class Trie<E> implements ReadonlyTrie<E> {

	static create<E>(): Trie<E> {
		return new Trie('', undefined);
	}

	private _size: number = 0;
	private _depth: number = 0;
	private readonly _children = new Map<string, Trie<E>>();

	private constructor(readonly ch: string, public element: Entry<E> | undefined) { }

	get size() {
		return this._size;
	}

	get depth() {
		return this._depth;
	}

	set(str: string, element: E): void {
		let chars = Array.from(str);
		let node: Trie<E> = this;
		for (let pos = 0; pos < chars.length; pos++) {
			node._depth = Math.max(chars.length - pos, node._depth);
			const ch = chars[pos];
			let child = node._children.get(ch);
			if (!child) {
				child = new Trie<E>(ch, undefined);
				node._children.set(ch, child);
			}
			node = child;
		}
		if (!node.element) {
			this._size += 1;
			node.element = new Entry(str, element);
		} else {
			node.element.value = element;
		}
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

	delete(str: string): boolean {
		let chars = Array.from(str);
		let node: Trie<E> = this;
		let path: [string, Trie<E>][] = [];
		for (let pos = 0; pos < chars.length; pos++) {
			const ch = chars[pos];
			let child = node._children.get(ch);
			if (!child) {
				return false;
			}
			path.push([ch, node]);
			node = child;
		}

		if (!node.element) {
			return false;
		}

		// unset element
		node.element = undefined;
		this._size -= 1;

		// cleanup parents and update depths
		while (path.length > 0) {
			// parent
			const [nodeCh, parent] = path.pop()!;
			if (node._children.size === 0 && !node.element) {
				parent._children.delete(nodeCh);
			}
			node = parent;

			if (node._children.size === 0) {
				node._depth = 0;
			} else {
				let newDepth = 0;
				for (let child of node._children.values()) {
					newDepth = Math.max(newDepth, child.depth);
				}
				node._depth = 1 + newDepth;
			}
		}

		return true;
	}

	*query(str: string[]): IterableIterator<[string, E]> {
		let bucket = new Set<Trie<E>>();
		this._query(str, 0, bucket);
		for (let item of bucket) {
			yield* item;
		}
	}

	private _query(str: string[], pos: number, bucket: Set<Trie<E>>) {
		if (bucket.has(this)) {
			return;
		}
		if (pos >= str.length) {
			bucket.add(this);
			return;
		}
		if (str.length - pos > this._depth) {
			// there is more characters left than there are nodes
			return;
		}
		for (let [ch, child] of this._children) {
			if (ch.toLowerCase() === str[pos].toLowerCase()) {
				child._query(str, pos + 1, bucket);
			}
			if (pos > 0) {
				// only proceed fuzzy if the first character has matched
				child._query(str, pos, bucket);
			}
		}
	}

	*[Symbol.iterator](): IterableIterator<[string, E]> {
		const stack: Trie<E>[] = [this];
		while (stack.length > 0) {
			const node = stack.shift()!;
			if (node.element) {
				yield [node.element.key, node.element.value];
			}
			for (let child of node._children.values()) {
				stack.push(child);
			}
		}
	}
}
