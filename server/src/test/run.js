/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

const path = require('path');
const url = require('url');
const { chromium } = require('playwright');
const events = require('events');
const mocha = require('mocha');

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

	const emitter = new events.EventEmitter();
	const runner = new EchoRunner(emitter);
	// @ts-ignore
	new mocha.reporters.Spec(runner)
	await page.exposeFunction('mocha_report', (type, data1, data2) => runner.emit(type, data1, data2));

	const target = url.pathToFileURL(path.join(__dirname, 'index.html'));
	if (_debug) {
		target.search = '?debug';
	}
	await page.goto(target.href);


	async function moch_run() {
		const failCount = await page.evaluate(() => {
			// @ts-ignore
			return mocha_run()
		})
		console.log('FAILED tests: ' + failCount)
		if (!_debug) {
			await browser.close();
			// @ts-ignore
			process.exit(failCount);
		} else {
			page.once('load', moch_run)
		}
	}

	moch_run();

})();


class EchoRunner extends events.EventEmitter {

	constructor(event, title = '') {
		super();
		// createStatsCollector(this);
		event.on('start', () => this.emit('start'));
		event.on('end', () => this.emit('end'));
		event.on('suite', (suite) => this.emit('suite', EchoRunner.deserializeSuite(suite, title)));
		event.on('suite end', (suite) => this.emit('suite end', EchoRunner.deserializeSuite(suite, title)));
		event.on('test', (test) => this.emit('test', EchoRunner.deserializeRunnable(test)));
		event.on('test end', (test) => this.emit('test end', EchoRunner.deserializeRunnable(test)));
		event.on('hook', (hook) => this.emit('hook', EchoRunner.deserializeRunnable(hook)));
		event.on('hook end', (hook) => this.emit('hook end', EchoRunner.deserializeRunnable(hook)));
		event.on('pass', (test) => this.emit('pass', EchoRunner.deserializeRunnable(test)));
		event.on('fail', (test, err) => this.emit('fail', EchoRunner.deserializeRunnable(test, title), EchoRunner.deserializeError(err)));
		event.on('pending', (test) => this.emit('pending', EchoRunner.deserializeRunnable(test)));
	}

	static deserializeSuite(suite, titleExtra) {
		return {
			root: suite.root,
			suites: suite.suites,
			tests: suite.tests,
			title: titleExtra && suite.title ? `${suite.title} - /${titleExtra}/` : suite.title,
			titlePath: () => suite.titlePath,
			fullTitle: () => suite.fullTitle,
			timeout: () => suite.timeout,
			retries: () => suite.retries,
			slow: () => suite.slow,
			bail: () => suite.bail
		};
	}

	static deserializeRunnable(runnable, titleExtra) {
		return {
			title: runnable.title,
			fullTitle: () => titleExtra && runnable.fullTitle ? `${runnable.fullTitle} - /${titleExtra}/` : runnable.fullTitle,
			titlePath: () => runnable.titlePath,
			async: runnable.async,
			slow: () => runnable.slow,
			speed: runnable.speed,
			duration: runnable.duration,
			currentRetry: () => runnable.currentRetry,
		};
	}

	static deserializeError(err) {
		const inspect = err.inspect;
		err.inspect = () => inspect;
		return err;
	}
}
