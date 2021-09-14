/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

const path = require('path');
const url = require('url');
const { chromium } = require('playwright');
const { readFileSync, readdirSync } = require('fs');

const _debug = process.argv.includes('--debug');


async function testDocumentSymbols() {
	const browser = await chromium.launch({
		headless: !_debug,
		devtools: _debug,
		args: [
			'--disable-web-security',
		]
	});

	const context = await browser.newContext();
	const page = await context.newPage();

	if (_debug) {
		page.on('console', async msg => {
			for (let i = 0; i < msg.args().length; ++i) { console.log(`${i}: ${await msg.args()[i].jsonValue()}`); }
		});
	}

	page.exposeFunction('tree_sitter_bootstrap', () => {
		const result = {
			treeSitterWasmUri: url.pathToFileURL(path.join(__dirname, '../../tree-sitter/tree-sitter.wasm')).href,
			languages: [
				{ languageId: 'csharp', wasmUri: path.join(__dirname, '../../tree-sitter-c_sharp.wasm'), suffixes: [] },
				{ languageId: 'c', wasmUri: path.join(__dirname, '../../tree-sitter-c.wasm'), suffixes: [] },
				{ languageId: 'cpp', wasmUri: path.join(__dirname, '../../tree-sitter-cpp.wasm'), suffixes: [] },
				{ languageId: 'go', wasmUri: path.join(__dirname, '../../tree-sitter-go.wasm'), suffixes: [] },
				{ languageId: 'java', wasmUri: path.join(__dirname, '../../tree-sitter-java.wasm'), suffixes: [] },
				{ languageId: 'php', wasmUri: path.join(__dirname, '../../tree-sitter-php.wasm'), suffixes: [] },
				{ languageId: 'python', wasmUri: path.join(__dirname, '../../tree-sitter-python.wasm'), suffixes: [] },
				{ languageId: 'rust', wasmUri: path.join(__dirname, '../../tree-sitter-rust.wasm'), suffixes: [] },
				{ languageId: 'typescript', wasmUri: path.join(__dirname, '../../tree-sitter-typescript.wasm'), suffixes: [] },
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
		let errorCount = 0;
		page.exposeFunction('report_result', (uri, messages) => {
			expect.delete(uri)
			console.log(uri)
			for (let message of messages) {
				if (message.ok) {
					console.log(message.ok)
				} else {
					console.error(message.err)
					errorCount += 1
				}
			}
			if (expect.size === 0) {
				resolve(errorCount);
			}
		});
		setTimeout(() => reject(new Error('timeout')), 5000);
	});

	const target = url.pathToFileURL(path.join(__dirname, './documentSymbols/index.html'));
	await page.goto(target.href);

	const exitCode = await p;

	page.close();
	return exitCode;
}

async function testDocumentSymbols() {
	const browser = await chromium.launch({
		headless: !_debug,
		devtools: _debug,
		args: [
			'--disable-web-security',
		]
	});

	const context = await browser.newContext();
	const page = await context.newPage();

	if (_debug) {
		page.on('console', async msg => {
			for (let i = 0; i < msg.args().length; ++i) { console.log(`${i}: ${await msg.args()[i].jsonValue()}`); }
		});
	}

	page.exposeFunction('tree_sitter_bootstrap', () => {
		const result = {
			treeSitterWasmUri: url.pathToFileURL(path.join(__dirname, '../../tree-sitter/tree-sitter.wasm')).href,
			languages: [
				{ languageId: 'csharp', wasmUri: path.join(__dirname, '../../tree-sitter-c_sharp.wasm'), suffixes: [] },
				{ languageId: 'c', wasmUri: path.join(__dirname, '../../tree-sitter-c.wasm'), suffixes: [] },
				{ languageId: 'cpp', wasmUri: path.join(__dirname, '../../tree-sitter-cpp.wasm'), suffixes: [] },
				{ languageId: 'go', wasmUri: path.join(__dirname, '../../tree-sitter-go.wasm'), suffixes: [] },
				{ languageId: 'java', wasmUri: path.join(__dirname, '../../tree-sitter-java.wasm'), suffixes: [] },
				{ languageId: 'php', wasmUri: path.join(__dirname, '../../tree-sitter-php.wasm'), suffixes: [] },
				{ languageId: 'python', wasmUri: path.join(__dirname, '../../tree-sitter-python.wasm'), suffixes: [] },
				{ languageId: 'rust', wasmUri: path.join(__dirname, '../../tree-sitter-rust.wasm'), suffixes: [] },
				{ languageId: 'typescript', wasmUri: path.join(__dirname, '../../tree-sitter-typescript.wasm'), suffixes: [] },
			]
		};
		return result;
	});


	const expect = new Set();

	page.exposeFunction('document_highlights_fixtures', () => {
		const dir = path.join(__dirname, './documentHighlights/fixtures');
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
		let errorCount = 0;
		page.exposeFunction('report_result', (uri, messages) => {
			expect.delete(uri)
			console.log(uri)
			for (let message of messages) {
				if (message.ok) {
					console.log(message.ok)
				} else {
					console.error(message.err)
					errorCount += 1
				}
			}
			if (expect.size === 0) {
				resolve(errorCount);
			}
		});
		setTimeout(() => reject(new Error('timeout')), 5000);
	});

	const target = url.pathToFileURL(path.join(__dirname, './documentHighlights/index.html'));
	await page.goto(target.href);

	const exitCode = await p;

	page.close();
	return exitCode;
}


(async () => {

	const exitCode1 = await testDocumentSymbols()

	console.error(`${exitCode1} FAILURES`)

	process.exit(exitCode1);


})();
