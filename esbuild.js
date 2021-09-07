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
				console.log('watch build succeeded:', result);
			}
		}
	}
}

// --- extension

const client = esbuild.build({
	entryPoints: ['src/client/main.ts'],
	outfile: 'dist/extension.js',
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
	entryPoints: ['src/server/main.ts'],
	outfile: 'dist/anycode.server.js',
	bundle: true,
	external: ['fs', 'path'], // not ideal but because of treesitter/emcc
	target: 'es2020',
	format: 'iife',
	watch
}).catch((e) => {
	console.error(e)
});

Promise.all([client, server]).then(() => {
	if (watch) {
		console.log('done building, watching for file changes')
	} else {
		console.log('done building')
	}
})
