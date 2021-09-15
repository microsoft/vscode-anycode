/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from "vscode-languageserver";
import Parser from "../../../tree-sitter/tree-sitter";
import { compareRangeByStart } from "../../common";
import { DocumentStore } from "../../documentStore";
import { DocumentHighlightsProvider } from "../../features/documentHighlights";
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

	type DocumentHighlightCoord = {
		start: number;
		name: string;
	};

	const expected: DocumentHighlightCoord[] = [];
	const parts = text.split(r);
	const idents = text.match(r)!;

	text = '';
	for (let i = 0; i < parts.length; i++) {
		text += parts[i];

		let ident = idents[i];
		if (ident) {
			let name = ident.slice(1, -1);
			expected.push({
				start: text.length,
				name
			});
			text += name;
		}
	}

	const store = new TestDocumentStore({ uri, languageId, text, version: 1 });
	const trees = new Trees(store);
	const highlights = new DocumentHighlightsProvider(store, trees);

	const textDocument = store.get(uri)!;

	const result = await highlights.provideDocumentHighlights({ textDocument: { uri }, position: textDocument.positionAt(expected[0].start) });
	if (result.length !== expected.length) {
		messages.push({ err: '  WRONG number of highlights' });
	}

	result.sort((a, b) => compareRangeByStart(a.range, b.range));

	for (let highlight of result) {
		const prefix = ' '.repeat(2);
		const e = expected.shift();
		if (!e) {
			messages.push({ err: `${prefix}highlight NOT expected: ${highlight.range.start.line},${highlight.range.start.character}` });
		} else if (textDocument.offsetAt(highlight.range.start) !== e.start) {
			messages.push({ err: `${prefix}BAD offset for ${e.name} expected ${e.start}, actual: ${textDocument.offsetAt(highlight.range.start)}` });
		} else {
			messages.push({ ok: `${prefix}✓ ${highlight.range.start.line},${highlight.range.start.character}-${highlight.range.end.line},${highlight.range.end.character}` });
		}
	}

	if (expected.length > 0) {
		messages.push({ err: `also EXPECTED ${expected.map(e => e.name)}` });
	}
}

(async function () {


	type InitData = {
		treeSitterWasmUri: string;
		languages: { languageId: string, wasmUri: string | Uint8Array, suffixes: string[] }[],

	};

	//@ts-expect-error
	const data: InitData = await window.tree_sitter_bootstrap();
	//@ts-expect-error
	const fixtures: TestFixture[] = await window.document_highlights_fixtures();

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
