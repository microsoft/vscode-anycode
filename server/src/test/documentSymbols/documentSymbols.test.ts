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


function absoluteUrl(relative: string): string {
	//@ts-expect-error
	const base = new URL(window.location.href);
	return new URL(relative, base).toString();
}

suite('DocumentSymbols', function () {

	suiteSetup(async function () {

		await Parser.init({
			locateFile() {
				return absoluteUrl('../../tree-sitter/tree-sitter.wasm');
			}
		});

		await Languages.init([
			{ languageId: 'java', wasmUri: await fetch2(absoluteUrl('../../tree-sitter-java.wasm')), suffixes: [] }
		]);
	});

	test('Testme', async function () {

		const uri = 'some:/file.java';
		const documents = new TestDocumentStore(
			{ uri, languageId: 'java', version: 1, text: 'class Program {}' }
		);


		const trees = new Trees(documents);

		const symbols = new DocumentSymbols(documents, trees);

		const result = await symbols.provideDocumentSymbols({ textDocument: { uri } });


		chai.assert.equal(result.length, 1);
		chai.assert.equal(result[0].name, 'Program');

	});

	test('fixtures', async function () {

		const uri = absoluteUrl('./documentSymbols/fixtures/java.txt');
		const data = await fetch2(uri);

		const text = new TextDecoder().decode(data);

		const samples = text.split('---')
			.map(s => s.trim())
			.filter(s => Boolean(s));

		console.log(text, samples);

		for (let sample of samples) {

			const item: lsp.TextDocumentItem = {
				uri,
				version: 1,
				languageId: 'java',
				text: sample
			};


			const documents = new TestDocumentStore(item);
			const trees = new Trees(documents);
			const symbols = new DocumentSymbols(documents, trees);
			const result = await symbols.provideDocumentSymbols({ textDocument: { uri } });

			chai.assert.ok(result.length > 0);
		}

	});

});
