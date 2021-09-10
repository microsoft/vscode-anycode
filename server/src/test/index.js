/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

const path = require('path');
const url = require('url');
const { chromium } = require('playwright');
const { test } = require('@playwright/test');
const { readFileSync, readdirSync } = require('fs');

const _debug = process.argv.includes('--debug');

(async () => {
	const browser = await chromium.launch({
		headless: !_debug,
		devtools: _debug,
		args: [
			'--disable-web-security',
		]
	});

	const context = await browser.newContext();
	const page = await context.newPage();

	// page.on('console', async msg => {
	// 	for (let i = 0; i < msg.args().length; ++i) { console.log(`${i}: ${await msg.args()[i].jsonValue()}`); }
	// });

	page.exposeFunction('tree_sitter_bootstrap', () => {
		const result = {
			treeSitterWasmUri: url.pathToFileURL(path.join(__dirname, '../../tree-sitter/tree-sitter.wasm')).href,
			languages: [
				{ languageId: 'java', wasmUri: path.join(__dirname, '../../tree-sitter-java.wasm'), suffixes: [] },
				{ languageId: 'go', wasmUri: path.join(__dirname, '../../tree-sitter-go.wasm'), suffixes: [] },
			]
		};
		return result;
	});


	const expect = new Set();

	page.exposeFunction('document_symbol_fixtures', () => {
		const dir = path.join(__dirname, './documentSymbols/fixtures');
		const data = [];
		for (let item of readdirSync(dir)) {
			const uri = path.join(dir, item);
			const languageId = path.basename(item, path.extname(item));
			const text = readFileSync(uri).toString();
			data.push({ uri, languageId, text });

			expect.add(uri)
		}
		return data;
	});

	const p = new Promise((resolve, reject) => {
		page.exposeFunction('report_result', (uri, message) => {
			expect.delete(uri)
			console.log(uri)
			console.log(message)
			if (expect.size === 0) {
				resolve(undefined);
			}
		});
		setTimeout(() => reject(new Error('timeout')), 5000);
	});

	const target = url.pathToFileURL(path.join(__dirname, './documentSymbols/index.html'));
	await page.goto(target.href);

	await p;

	page.close();
	process.exit();
})();
