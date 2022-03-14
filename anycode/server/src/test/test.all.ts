/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './trie.test';

import * as documentHighlights from './documentHighlights.test';
import * as documentSymbols from './documentSymbols.test';
import * as queries from './queries.test';
import { FeatureConfig, LanguageInfo } from '../common';
import Parser from 'web-tree-sitter';
import Languages from '../languages';

(async function () {

	try {

		await Parser.init({
			locateFile() {
				return '/anycode/server/node_modules/web-tree-sitter/tree-sitter.wasm';
			}
		});

		const config = new Map<LanguageInfo, FeatureConfig>();

		// @ts-expect-error
		const target = new URL(window.location);
		const langInfo: LanguageInfo[] = JSON.parse(target.searchParams.get('languages') ?? "");

		for (let info of langInfo) {
			config.set(info, {});
			queries.init(info);
		}

		await Languages.init(config);

		const outline = target.searchParams.get('outline') ?? '';
		await documentSymbols.init(outline, langInfo[0].languageId);

		const highlights = target.searchParams.get('highlights') ?? '';
		await documentHighlights.init(highlights, langInfo[0].languageId);

		run(); // MOCHA-delayed run

	} catch (err) {
		// @ts-expect-error
		window.report_mocha_done(err);
		console.error(err);
	}
})();
