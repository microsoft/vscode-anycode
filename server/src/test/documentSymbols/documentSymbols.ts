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

	const result: { ok?: string, err?: string }[] = [];
	try {
		for (const text of parts) {
			await assertOneFixture(item.uri, item.languageId, text, result);
		}
	} catch (e) {
		result.unshift({ err: String(e) });
	}

	(<any>globalThis).report_result(item.uri, result);
}

async function assertOneFixture(uri: string, languageId: string, text: string, messages: { ok?: string, err?: string }[]) {

	const r = /\[[^\]]+\]/g;

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

	const textDocument = store.get(uri)!;

	const result = await symbols.provideDocumentSymbols({ textDocument: { uri } });
	if (result.length === 0) {
		messages.push({ err: 'NO results' });
	}

	(function walk(symbols: lsp.DocumentSymbol[], indent: number = 2) {
		for (let symbol of symbols) {
			const prefix = ' '.repeat(indent);
			const e = expected.shift();
			if (!e) {
				messages.push({ err: `${prefix}symbol NOT expected: ${symbol.name}@${symbol.range.start.line},${symbol.range.start.character}` });
			} else if (symbol.name !== e.name) {
				messages.push({ err: `${prefix}expected: ${e.name}, actual: ${symbol.name}` });
			} else if (textDocument.offsetAt(symbol.selectionRange.start) !== e.start) {
				messages.push({ err: `${prefix}BAD offset for ${e.name} expected ${e.start}, actual: ${textDocument.offsetAt(symbol.selectionRange.start)}` });
			} else {
				messages.push({ ok: `${prefix}✓ ${symbol.name}` });
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
