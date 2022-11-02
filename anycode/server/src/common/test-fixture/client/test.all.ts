/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as documentHighlights from './documentHighlights.test';
import * as documentSymbols from './documentSymbols.test';
import * as queries from './queries.test';
import Parser from 'web-tree-sitter';
import Languages from '../../languages';
import { FeatureConfig, LanguageData, LanguageInfo } from '../../../../../shared/common/initOptions';
import { encodeBase64 } from '../../../../../shared/common/base64';

(async function () {

	try {

		await Parser.init({
			locateFile() {
				return '/anycode/server/node_modules/web-tree-sitter/tree-sitter.wasm';
			}
		});

		const config: [LanguageInfo, FeatureConfig][] = [];

		// @ts-expect-error
		const target = new URL(window.location);
		const langInfo: LanguageInfo[] = JSON.parse(target.searchParams.get('languages') ?? "");

		for (let info of langInfo) {
			config.push([info, {}]);
			queries.init(info);
		}

		Languages.init(config);

		for (let info of langInfo) {
			const data = await fetch((<any>info).wasmUri);
			const base64 = encodeBase64(new Uint8Array(await data.arrayBuffer()));
			Languages.setLanguageData(info.languageId, new LanguageData(base64, info.queryInfo));
		}

		const outline = target.searchParams.get('outline');
		if (outline) {
			const langId = Languages.getLanguageIdByUri(outline);
			await documentSymbols.init(outline, langId);
		}

		const highlights = target.searchParams.get('highlights');
		if (highlights) {
			const langId = Languages.getLanguageIdByUri(highlights);
			await documentHighlights.init(highlights, langId);
		}

		run(); // MOCHA-delayed run

	} catch (err) {
		// @ts-expect-error
		window.report_mocha_done(err);
		console.error(err);
	}
})();
