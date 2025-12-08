/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch')

// --- extension

const clientBuildOptions = {
	bundle: true,
	external: ['vscode'],
	target: 'es2020',
	format: 'cjs',
	sourcemap: 'external'
}

const browserClient = await esbuild.context({
	...clientBuildOptions,
	entryPoints: ['client/src/browser/main.ts'],
	outfile: 'dist/anycode.extension.browser.js',
}).catch((e) => {
	console.error(e)
});

const nodeClient = await esbuild.context({
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
	sourcemap: 'external'
}

const browserServer = await esbuild.context({
	...serverBuildOptions,
	entryPoints: ['server/src/browser/main.ts'],
	outfile: 'dist/anycode.server.browser.js',
}).catch((e) => {
	console.error(e)
});

const nodeServer = await esbuild.context({
	...serverBuildOptions,
	platform: 'node',
	entryPoints: ['server/src/node/main.ts'],
	outfile: 'dist/anycode.server.node.js',
}).catch((e) => {
	console.error(e)
});

const serverTests = await esbuild.context({
	entryPoints: ['server/src/common/test/trie.test.ts'],
	outfile: 'server/src/common/test/trie.test.js',
	bundle: true,
	external: ['fs', 'path'], // not ideal but because of treesitter/emcc
	target: 'es2020',
	format: 'iife',
}).catch((e) => {
	console.error(e)
});

// --- tests-fixtures

const testFixture = await esbuild.context({
	entryPoints: ['server/src/common/test-fixture/client/test.all.ts'],
	outfile: 'server/src/common/test-fixture/client/test.all.js',
	bundle: true,
	define: { process: '{"env":{}}' }, // assert-lib
	external: ['fs', 'path'], // not ideal but because of treesitter/emcc
	target: 'es2020',
}).catch((e) => {
	console.error(e)
});



const all = [
	browserClient, browserServer, // client
	nodeClient, nodeServer, // server
	serverTests, testFixture
];
Promise.all(all).then(() => {

	if (!isWatch) {
		all.forEach(build => build.dispose());
		console.log('done building')
		return;
	}

	all.forEach(build => {
		build.watch({ delay: 500 })
	});
	console.log('done building, start watching...')
})
