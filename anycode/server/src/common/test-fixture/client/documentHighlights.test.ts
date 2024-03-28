/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { DocumentHighlight } from 'vscode-languageserver-types';
import { compareRangeByStart } from '../../common';
import { DocumentHighlightsProvider } from '../../features/documentHighlights';
import { Trees } from '../../trees';
import { Fixture, TestDocumentStore } from './utils';

export async function init(fixture: string, langId: string) {

	const fixtures = await Fixture.parse(fixture, langId);

	suite(`DocumentHighlights - Fixtures: ${langId}`, function () {
		// debugger;
		const store = new TestDocumentStore(...fixtures.map(f => f.document));

		for (let item of fixtures) {
			test(item.name, async function () {
				const trees = new Trees(store);
				const symbols = new DocumentHighlightsProvider(store, trees);
				const result = await symbols.provideDocumentHighlights({
					textDocument: { uri: item.document.uri },
					position: item.document.positionAt(item.marks[0].start)
				});
				assertDocumentHighlights(item, result);
				trees.dispose();
			});
		}
	});
}

function assertDocumentHighlights(fixture: Fixture, actual: DocumentHighlight[]) {

	actual.sort((a, b) => compareRangeByStart(a.range, b.range));

	if (actual.length === 0) {
		assert.fail('NO symbols found: ' + fixture.name);
	}

	for (let highlight of actual) {
		const e = fixture.marks.shift();
		assert.ok(e, `${fixture.name}: MISSING hightlight`);
		assert.strictEqual(fixture.document.offsetAt(highlight.range.start), e.start, `${fixture.name}: BAD start range`);
	}

	if (fixture.marks.length > 0) {
		assert.fail('not ALL MARKS seen: ' + fixture.name);
	}
}
