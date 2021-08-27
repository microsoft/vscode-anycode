
import * as assert from 'assert';
import { suite, test } from 'mocha';
import { Trie } from '../../src/util/trie';

suite('trie', function () {

	function assertTrie<E>(trie: Trie<E>, expected: [key: string, value: E][]) {

		const map = new Map(expected);

		for (let item of trie) {
			const expected = map.get(item[0]);
			assert.strictEqual(expected, item[1]);

			map.delete(item[0]);
		}

		assert.strictEqual(map.size, 0);
	}

	test('set/get', function () {

		const trie = Trie.create();
		trie.set('abc', true);
		trie.set('abc', true);
		trie.set('abc', true);
		trie.set('abc', true);
		assertTrie(trie, [['abc', true]]);

		trie.delete('abc');
		assertTrie(trie, []);

		trie.set('abc', true);
		assertTrie(trie, [['abc', true]]);

		trie.set('Abc', true);
		assertTrie(trie, [['abc', true], ['Abc', true]]);
	});

	test('delete', function () {

		const trie = Trie.create();
		assertTrie(trie, []);

		trie.delete('abc');
		assertTrie(trie, []);

		trie.set('abc', true);
		assertTrie(trie, [['abc', true]]);

		trie.delete('abc');
		assertTrie(trie, []);
	});

	test('query', function () {

		const trie = Trie.create();
		trie.set('abc', 1);
		trie.set('Abc', 2);
		trie.set('Ab', 3);
		trie.set('Afoobfooc', 4);

		const actual = Array.from(trie.query(['A', 'C'])).map(e => e[1]).sort();
		assert.deepStrictEqual(actual, [1, 2, 4]);
	});
});
