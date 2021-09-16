/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import Languages from '../languages';
import { Queries, QueryType } from '../queries';
import { bootstrapWasm } from './utils';

suite('Queries', function () {

	suiteSetup(async function () {
		await bootstrapWasm();
	});

	const types: QueryType[] = ['comments', 'folding', 'identifiers', 'locals', 'outline'];

	for (let type of types) {
		test(type, function () {
			const languages = Languages.allAsSelector();
			for (let languageId of languages) {
				try {
					const q = Queries.get(languageId, type, true);
					assert.ok(q);
				} catch (err) {
					assert.fail(`INVALID ${languageId}/ ${type}`);
				}
			}
		});
	}

});
