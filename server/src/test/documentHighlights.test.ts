/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { DocumentHighlight } from 'vscode-languageserver-types';
import { compareRangeByStart } from '../common';
import { DocumentHighlightsProvider } from '../features/documentHighlights';
import { Trees } from '../trees';
import { bootstrapWasm, Fixture, TestDocumentStore } from './utils';

suite('DocumentHighlight - Fixtures', function () {

	suiteSetup(async function () {
		await bootstrapWasm();
	});

	function assertDocumentHighlights(fixture: Fixture, actual: DocumentHighlight[]) {

		actual.sort((a, b) => compareRangeByStart(a.range, b.range));

		if (actual.length === 0) {
			assert.fail('NO symbols found: ' + fixture.name);
		}

		for (let highlight of actual) {
			const e = fixture.marks.shift();
			assert.ok(e);
			assert.strictEqual(fixture.document.offsetAt(highlight.range.start), e.start, fixture.name);
		}

		if (fixture.marks.length > 0) {
			assert.fail('not ALL MARKS seen: ' + fixture.name);
		}
	}

	['go', 'java', 'rust', 'csharp', 'php'].forEach(async langId => {
		test(langId, async function () {

			const fixtures = await Fixture.parse(`/server/src/test/documentHighlightsFixtures/${langId}.txt`, langId);
			const store = new TestDocumentStore(...fixtures.map(f => f.document));
			const trees = new Trees(store);

			for (let item of fixtures) {
				const symbols = new DocumentHighlightsProvider(store, trees);

				const result = await symbols.provideDocumentHighlights({
					textDocument: { uri: item.document.uri },
					position: item.document.positionAt(item.marks[0].start)
				});
				assertDocumentHighlights(item, result);
			}
		});
	});

});
