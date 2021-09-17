/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { DocumentSymbol } from 'vscode-languageserver-types';
import { DocumentSymbols } from '../features/documentSymbols';
import { Trees } from '../trees';
import { bootstrapWasm, Fixture, TestDocumentStore } from './utils';

suite('DocumentSymbols - Fixtures', function () {

	suiteSetup(async function () {
		await bootstrapWasm();
	});

	function assertDocumentSymbols(fixture: Fixture, actual: DocumentSymbol[]) {

		if (actual.length === 0) {
			assert.fail('NO symbols found');
		}

		(function walk(symbols: DocumentSymbol[]) {
			for (let symbol of symbols) {
				const expected = fixture.marks.shift();
				assert.ok(expected, `symbol NOT expected: ${symbol.name}@${symbol.range.start.line},${symbol.range.start.character}`);
				assert.strictEqual(symbol.name, expected.text);
				assert.strictEqual(fixture.document.offsetAt(symbol.selectionRange.start), expected.start);
				if (symbol.children) {
					walk(symbol.children);
				}
			}
		})(actual);

		if (fixture.marks.length > 0) {
			assert.fail(`also EXPECTED ${fixture.marks.map(e => e.text)}`);
		}
	}

	['go', 'java', 'python', 'rust', 'csharp'].forEach(async langId => {
		test(langId, async function () {

			const fixtures = await Fixture.parse(`/server/src/test/documentSymbolsFixtures/${langId}.txt`, langId);
			const store = new TestDocumentStore(...fixtures.map(f => f.document));
			const trees = new Trees(store);

			for (let item of fixtures) {
				const symbols = new DocumentSymbols(store, trees);
				const result = await symbols.provideDocumentSymbols({ textDocument: { uri: item.document.uri } });
				assertDocumentSymbols(item, result);
			}
		});
	});

});
