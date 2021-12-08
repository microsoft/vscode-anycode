/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Trie } from '../util/trie';

suite('Trie', function () {

	function assertKeys(trie: Trie<any>, keys: string[]) {
		const actual: string[] = [];
		for (let item of trie) {
			actual.push(item[0]);
		}
		assert.deepStrictEqual(actual, keys);
	}

	test('set/get/delete', function () {
		const trie = Trie.create<true>();
		trie.set('aa', true);
		trie.set('aaa', true);
		trie.set('foo', true);

		assertKeys(trie, ['aa', 'aaa', 'foo']);

		trie.set('Foo', true);
		trie.set('Foooo', true);
		assertKeys(trie, ['aa', 'aaa', 'foo', 'Foo', 'Foooo']);

		trie.delete('aa');
		assertKeys(trie, ['aaa', 'foo', 'Foo', 'Foooo']);

		trie.delete('Foooo');
		assertKeys(trie, ['aaa', 'foo', 'Foo']);
	});

	test('depth', function () {

		const trie = Trie.create<true>();

		trie.set('aa', true);
		assert.strictEqual(trie.depth, 2);

		trie.set('foo', true);
		assert.strictEqual(trie.depth, 3);

		assert.ok(trie.delete('foo'));
		assert.strictEqual(trie.depth, 2);

		trie.set('aaaa', true);
		assert.strictEqual(trie.depth, 4);

		assert.ok(trie.delete('aa'));
		assert.strictEqual(trie.depth, 4);

		trie.set('aaa', true);
		assert.strictEqual(trie.depth, 4);

		assert.ok(trie.delete('aaaa'));
		assert.strictEqual(trie.depth, 3);

		assertKeys(trie, ['aaa']);
	});

	test('query', function () {
		const trie = Trie.create<true>();
		trie.set('foo', true);
		trie.set('Foo', true);
		trie.set('barFoo', true);

		let arr = Array.from(trie.query(Array.from('fo')));
		assert.strictEqual(arr.length, 3);
		assert.strictEqual(arr[0][0], 'foo');
		assert.strictEqual(arr[1][0], 'Foo');
		assert.strictEqual(arr[2][0], 'barFoo');

		arr = Array.from(trie.query(Array.from('b')));
		assert.strictEqual(arr.length, 1);

		arr = Array.from(trie.query(Array.from('foobar')));
		assert.strictEqual(arr.length, 0);
	});
});
