/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

const esbuild = require('esbuild')


let watch;
if (process.argv.includes('--watch')) {
	watch = {
		onRebuild(error, result) {
			if (error) {
				console.error('watch build failed:', error);
			} else {
				console.log('watch build succeeded');
			}
		}
	}
}

// --- extension

const clientBuildOptions = {
	bundle: true,
	external: ['vscode'],
	target: 'es2020',
	format: 'cjs',
	watch
}

const browserClient = esbuild.build({
	...clientBuildOptions,
	entryPoints: ['client/src/browser/main.ts'],
	outfile: 'dist/anycode.extension.browser.js',
}).catch((e) => {
	console.error(e)
});

const nodeClient = esbuild.build({
	...clientBuildOptions,
	platform: 'node',
	entryPoints: ['client/src/node/main.ts'],
	outfile: 'dist/anycode.extension.node.js',
}).catch((e) => {
	console.error(e)
});

// --- server

const serverBuildOptions = {
	bundle: true,
	external: ['fs', 'path'], // not ideal but because of treesitter/emcc
	target: 'es2020',
	format: 'iife',
	watch
}

const browserServer = esbuild.build({
	...serverBuildOptions,
	entryPoints: ['server/src/browser/main.ts'],
	outfile: 'dist/anycode.server.browser.js',
}).catch((e) => {
	console.error(e)
});

const nodeServer = esbuild.build({
	...serverBuildOptions,
	platform: 'node',
	entryPoints: ['server/src/node/main.ts'],
	outfile: 'dist/anycode.server.node.js',
}).catch((e) => {
	console.error(e)
});

const serverTests = esbuild.build({
	entryPoints: ['server/src/common/test/trie.test.ts'],
	outfile: 'server/src/common/test/trie.test.js',
	bundle: true,
	external: ['fs', 'path'], // not ideal but because of treesitter/emcc
	target: 'es2020',
	format: 'iife',
	watch
}).catch((e) => {
	console.error(e)
});

// --- tests-fixtures

const testFixture = esbuild.build({
	entryPoints: ['server/src/common/test-fixture/client/test.all.ts'],
	outfile: 'server/src/common/test-fixture/client/test.all.js',
	bundle: true,
	define: { process: '{"env":{}}' }, // assert-lib
	external: ['fs', 'path'], // not ideal but because of treesitter/emcc
	target: 'es2020',
	watch
}).catch((e) => {
	console.error(e)
});

Promise.all([
	browserClient, browserServer, // client
	nodeClient, nodeServer, // server
	serverTests, testFixture // testing
]).then(() => {
	if (watch) {
		console.log('done building, watching for file changes')
	} else {
		console.log('done building')
	}
})
