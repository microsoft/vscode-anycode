/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from "vscode-languageserver";
import Parser from "../../../tree-sitter/tree-sitter";
import { DocumentStore } from "../../documentStore";
import { DocumentSymbols } from "../../features/documentSymbols";
import Languages from "../../languages";
import { Trees } from "../../trees";

export function mock<T>(): { new(): T } {
	return function () { } as any;
}

class TestDocumentStore extends DocumentStore {

	constructor(...docs: lsp.TextDocumentItem[]) {
		super(
			new class extends mock<lsp.Connection>() {
				onDidOpenTextDocument(handler: lsp.NotificationHandler<lsp.DidOpenTextDocumentParams>) {
					for (let doc of docs) {
						handler({ textDocument: doc });
					}
				}
				onDidChangeTextDocument() { }
				onDidCloseTextDocument() { }
				onWillSaveTextDocument() { }
				onWillSaveTextDocumentWaitUntil() { }
				onDidSaveTextDocument() { }
				onNotification() { }
			}
		);
	}
}

function fetch2(url: string): Promise<Uint8Array> {
	return new Promise(resolve => {
		const r = new XMLHttpRequest();
		r.open('GET', url, true);
		r.responseType = 'arraybuffer';
		r.onload = (() => {
			resolve(new Uint8Array(r.response));
		});
		r.send(null);
	});
}

interface TestFixture {
	uri: string;
	languageId: string;
	text: string;
}

async function assertFixture(item: TestFixture) {

	const parts = item.text.split('---')
		.filter(s => Boolean(s));

	const result: string[] = [];
	try {
		for (const text of parts) {
			await assertOneFixture(item.uri, item.languageId, text, result);
		}
	} catch (e) {
		result.unshift(String(e));
	}

	(<any>globalThis).report_result(item.uri, result.join('\n'));
}

async function assertOneFixture(uri: string, languageId: string, text: string, messages: string[]) {

	const r = /\[\w+\]/g;

	type SymbolCoord = {
		name: string;
		start: number;
	};

	const expected: SymbolCoord[] = [];
	const parts = text.split(r);
	const idents = text.match(r)!;

	text = '';
	for (let i = 0; i < parts.length; i++) {
		text += parts[i];

		let ident = idents[i];
		if (ident) {
			let name = ident.slice(1, -1);
			expected.push({
				name,
				start: text.length,
			});
			text += name;
		}
	}

	const store = new TestDocumentStore({ uri, languageId, text, version: 1 });
	const trees = new Trees(store);
	const symbols = new DocumentSymbols(store, trees);

	const textDocument = store.get(uri);

	const result = await symbols.provideDocumentSymbols({ textDocument: { uri } });

	(function walk(symbols: lsp.DocumentSymbol[], indent: number = 0) {
		for (let symbol of symbols) {
			const prefix = ' '.repeat(indent);
			const e = expected.shift();
			if (!e) {
				messages.push(`${prefix}symbols NOT expected: ${symbol.name}@${symbol.range.start.line}`);
			} else if (symbol.name !== e.name) {
				messages.push(`${prefix}expected: ${e.name}, actual: ${symbol.name}`);
			} else {
				messages.push(`${prefix}✓ ${symbol.name}`);
			}
			if (symbol.children) {
				walk(symbol.children, indent + 2);
			}
		}
	})(result);
}

(async function () {


	type InitData = {
		treeSitterWasmUri: string;
		languages: { languageId: string, wasmUri: string | Uint8Array, suffixes: string[] }[],

	};

	//@ts-expect-error
	const data: InitData = await window.tree_sitter_bootstrap();
	//@ts-expect-error
	const fixtures: TestFixture[] = await window.document_symbol_fixtures();

	console.log('data RECEIVED', data);

	await Parser.init({
		locateFile() {
			return data.treeSitterWasmUri;
		}
	});

	for (let item of data.languages) {
		item.wasmUri = await fetch2((<string>item.wasmUri));
	}

	await Languages.init(data.languages);
	console.log('INIT done');

	fixtures.forEach(assertFixture);
})();
