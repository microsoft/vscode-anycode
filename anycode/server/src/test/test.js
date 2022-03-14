/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

const { readFileSync, readdirSync } = require('fs');
const http = require('http');
const { join, relative } = require('path')
const { chromium } = require('playwright');
const yargs = require('yargs');


const args = yargs(process.argv.slice(2)).argv

const base = join(__dirname, '../../../..');
const port = 3000 + Math.ceil(Math.random() * 5080);

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
};

(async function () {

	const bootstrap = [];
	readAnycodeExtension(join(process.cwd(), 'package.json'), bootstrap)

	const target = new URL(`http://localhost:${port}/anycode/server/src/test/test.html`);
	target.searchParams.set('languages', JSON.stringify(bootstrap));

	if (typeof args['outline'] === 'string') {
		const outlinePath = join(process.cwd(), args['outline'])
		target.searchParams.set('outline', `/${relative(base, outlinePath)}`);
	}
	if (typeof args['highlights'] === 'string') {
		const highlightsPath = join(process.cwd(), args['highlights'])
		target.searchParams.set('highlights', `/${relative(base, highlightsPath)}`);
	}

	const server = http.createServer(requestListener);
	server.on('error', (err) => {
		console.error(err)
		process.exit(1)
	})

	await new Promise(resolve => server.listen(port, undefined, undefined, resolve));

	console.log(`test server LISTENS on port ${port}`)

	const browser = await chromium.launch({
		headless: !args.debug,
		devtools: !!args.debug,
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
		if (!args.debug) {
			setTimeout(() => reject('TIMEOUT'), 5000);
		}
	})

	await page.goto(target.href);

	const failCount = await mochaDone;

	if (args.debug) {
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

})().catch(err => {
	console.error('FAIL', err);
	process.exit(1)
})


function readAnycodeExtension(candidate, bucket) {
	let data;
	try {
		data = JSON.parse(readFileSync(candidate).toString());
	} catch (err) {
		console.warn(err)
		return;
	}

	let languages = data?.contributes?.['anycode-languages']
	if (!languages) {
		return;
	}

	if (!Array.isArray(languages)) {
		languages = [languages]
	}

	for (let lang of languages) {
		let queries = {};
		for (let prop in lang.queryPaths) {
			const query = join(candidate, '../', lang.queryPaths[prop])
			queries[prop] = readFileSync(query).toString();
		}

		bucket.push({
			languageId: lang.languageId,
			wasmUri: `/${relative(base, join(candidate, '../', lang.grammarPath))}`,
			suffixes: lang.extensions,
			queries
		})
	}
}
