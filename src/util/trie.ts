
// --- trie

class Entry<E> {
	constructor(readonly key: string, public value: E) { }
}

export class Trie<E> {

	static create<E>(): Trie<E> {
		return new Trie('', undefined);
	}

	private readonly _children = new Map<string, Trie<E>>();

	private constructor(readonly ch: string, public element: Entry<E> | undefined) { }

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
		while (node._children.size === 0 && !node.element && path.length > 0) {
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
			if (ch.toLowerCase() === str[pos].toLowerCase()) {
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
