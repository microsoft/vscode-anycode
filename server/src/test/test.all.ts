/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './trie.test';
import './queries.test';

import { bootstrapWasm } from './utils';
import * as documentHighlights from './documentHighlights.test';
import * as documentSymbols from './documentSymbols.test';

Promise.all([
	documentHighlights.init(),
	documentSymbols.init()
]).finally(async () => {

	await bootstrapWasm();

	return run(); // MOCHA-delayed run
});
