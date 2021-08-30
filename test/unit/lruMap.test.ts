/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { suite, test } from 'mocha';
import { LRUMap } from '../../src/util/lruMap';

suite('LRUMap', function () {

	test('set/get/cleanup', function () {

		const map = new LRUMap<number, true>(2);
		map.set(1, true);
		map.set(2, true);
		map.set(3, true);

		assert.deepStrictEqual(Array.from(map.keys()), [1, 2, 3]);

		map.get(12);
		map.get(3);
		map.get(1);
		assert.deepStrictEqual(Array.from(map.keys()), [2, 3, 1]);


		const tuples = map.cleanup();
		assert.deepStrictEqual(tuples, [[2, true], [3, true]]);
	});
});
