/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

const { rejects } = require('assert');
const { readFileSync } = require('fs');
const http = require('http');
const { join } = require('path')
const { chromium } = require('playwright');

const base = join(__dirname, '../../..')

const requestListener = function (req, res) {
	const path = join(base, req.url);
	// console.log(path, base, req.url)
	try {
		const buffer = readFileSync(path)
		res.writeHead(200);
		res.end(buffer);
	} catch {
		res.writeHead(404);
		res.end();
	}
}


const _debug = process.argv.includes('--debug');


(async function () {

	const server = http.createServer(requestListener);
	server.listen(8080);

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

	await page.goto('http://localhost:8080/server/src/test/test.html');

	const failCount = await mochaDone;

	if (failCount > 0) {
		console.error(`${failCount} FAILURES`)
	} else {
		console.log('all good')
	}

	if (!_debug) {
		page.close();
		server.close();
		process.exit(failCount)
	}
})()
