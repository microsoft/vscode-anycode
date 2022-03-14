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

const client = esbuild.build({
	entryPoints: ['client/src/main.ts'],
	outfile: 'dist/anycode.extension.js',
	bundle: true,
	external: ['vscode'],
	target: 'es2020',
	format: 'cjs',
	watch
}).catch((e) => {
	console.error(e)
});

// --- server

const server = esbuild.build({
	entryPoints: ['server/src/main.ts'],
	outfile: 'dist/anycode.server.js',
	bundle: true,
	external: ['fs', 'path'], // not ideal but because of treesitter/emcc
	target: 'es2020',
	format: 'iife',
	loader: { '.scm': 'text' },
	watch
}).catch((e) => {
	console.error(e)
});

// --- server-tests

const testServer = esbuild.build({
	entryPoints: ['server/src/test-fixture/client/test.all.ts'],
	outfile: 'server/src/test-fixture/client/test.all.js',
	bundle: true,
	define: { process: '{"env":{}}' }, // assert-lib
	external: ['fs', 'path'], // not ideal but because of treesitter/emcc
	target: 'es2020',
	watch
}).catch((e) => {
	console.error(e)
});

Promise.all([client, server, testServer]).then(() => {
	if (watch) {
		console.log('done building, watching for file changes')
	} else {
		console.log('done building')
	}
})
