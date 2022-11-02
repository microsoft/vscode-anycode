/*---------------------------------------------------------------------------------------------
  *  Copyright (c) Microsoft Corporation. All rights reserved.
  *  Licensed under the MIT License. See License.txt in the project root for license information.
  *--------------------------------------------------------------------------------------------*/

//@ts-check

const { readFileSync } = require('fs');
const http = require('http');
const { join, relative } = require('path')
const { chromium } = require('playwright');

const args = (function () {
	const result = Object.create(null)
	let key = ''
	for (let arg of process.argv.slice(2)) {

		if (arg.startsWith('--')) {
			key = arg.slice(2)
			result[key] = true;
		} else if (key) {
			let value = result[key];
			if (value === true) {
				result[key] = arg;
			} else if (Array.isArray(value)) {
				value.push(arg)
			} else {
				result[key] = [value, arg];
			}
			key = ''

		} else {
			console.warn(`INVALID arg ${arg}`)
		}
	}


	return result;
})()

const base = join(__dirname, '../../../../..');
const port = 3000 + Math.ceil(Math.random() * 5080);

/**
 * @param {string} candidate
 * @returns {any[]}
 */
function readAnycodeExtension(candidate) {
	let data;
	try {
		data = JSON.parse(readFileSync(candidate).toString());
	} catch (err) {
		console.warn(err)
		return [];
	}

	let languages = data?.contributes?.['anycodeLanguages']
	if (!languages) {
		return [];
	}

	if (!Array.isArray(languages)) {
		languages = [languages]
	}
	const bucket = []

	for (let lang of languages) {
		let queryInfo = {};
		for (let prop in lang.queryPaths) {
			const query = join(candidate, '../', lang.queryPaths[prop])
			queryInfo[prop] = readFileSync(query).toString();
		}

		bucket.push({
			languageId: lang.languageId,
			wasmUri: `/${relative(base, join(candidate, '../', lang.grammarPath))}`,
			suffixes: lang.extensions,
			queryInfo
		})
	}
	return bucket;
}

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

async function runTests() {

	const target = new URL(`http://localhost:${port}/anycode/server/src/common/test-fixture/client/test.html`);

	const languages = readAnycodeExtension(join(process.cwd(), 'package.json'))
	target.searchParams.set('languages', JSON.stringify(languages));

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

	await new Promise(resolve => server.listen(port, undefined, undefined, () => resolve()));

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
		page.exposeFunction('report_mocha_done', (/** @type {number|string} */ failCount) => {
			resolve(failCount)
		})
		if (!args.debug) {
			setTimeout(() => reject('TIMEOUT'), 15000);
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

};

runTests().catch(err => {
	console.error('FAIL', err);
	process.exit(1)
});
