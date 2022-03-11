/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

const { readFileSync, readdirSync } = require('fs');
const http = require('http');
const { join, relative } = require('path')
const { chromium } = require('playwright');

const base = join(__dirname, '../../../..')

const requestListener = function (req, res) {
	const relative = req.url.replace(/\?.*$/, '')
	const path = join(base, relative);

	try {
		const buffer = readFileSync(path)
		res.writeHead(200);
		res.end(buffer);
	} catch (err) {
		// console.error(err);
		res.writeHead(404);
		res.end();
	}
}


const _debug = process.argv.includes('--debug');


const port = 3000 + Math.ceil(Math.random() * 5080);

(async function () {

	const bootstrap = readAnycodeExtensions();

	const server = http.createServer(requestListener);
	server.on('error', (err) => {
		console.error(err)
		process.exit(1)
	})

	await new Promise(resolve => server.listen(port, undefined, undefined, resolve));

	console.log(`test server LISTENS on port ${port}`)

	const browser = await chromium.launch({
		headless: !_debug,
		devtools: _debug,
		args: [
			'--disable-web-security',
		]
	});

	const context = await browser.newContext();
	const page = await context.newPage();

	const mochaDone = new Promise((resolve, reject) => {
		page.exposeFunction('report_mocha_done', (failCount) => {
			resolve(failCount)
		})
		setTimeout(reject, 5000);
	})

	await page.goto(`http://localhost:${port}/anycode/server/src/test/test.html?${encodeURIComponent(JSON.stringify(bootstrap))}`);

	const failCount = await mochaDone;

	if (_debug) {
		return;
	}

	if (failCount > 0) {
		console.error(`${failCount} FAILURES`)
	} else {
		console.log('all good')
	}
	page.close();
	server.close();
	process.exit(failCount)
})()


function readAnycodeExtensions() {

	const names = readdirSync(base).filter(name => name.startsWith('anycode-'))

	const result = [];

	for (let name of names) {
		const candidate = join(base, name, 'package.json');
		let data;
		try {
			data = JSON.parse(readFileSync(candidate).toString());
		} catch (err) {
			console.warn(err)
			continue;
		}

		let languages = data?.contributes?.['anycode-languages']
		if (!languages) {
			continue;
		}

		if (!Array.isArray(languages)) {
			languages = [languages]
		}

		for (let lang of languages) {
			let queries = {};
			for (let prop in lang.queryPaths) {
				const query = join(base, name, lang.queryPaths[prop])
				queries[prop] = readFileSync(query).toString();
			}

			result.push({
				languageId: lang.languageId,
				wasmUri: `/${relative(base, join(base, name, lang.grammarPath))}`,
				suffixes: lang.extensions,
				queries
			})
		}
	}

	return result;
}
