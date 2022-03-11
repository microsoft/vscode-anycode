/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './trie.test';
import './queries.test';

import { bootstrapWasm } from './utils';
import * as documentHighlights from './documentHighlights.test';
import * as documentSymbols from './documentSymbols.test';

(async function () {

	try {

		await bootstrapWasm();
		await documentHighlights.init();
		await documentSymbols.init();

		run(); // MOCHA-delayed run

	} catch (error) {
		// @ts-expect-error
		window.report_mocha_done(1);
		console.error(error);
	}
})();
