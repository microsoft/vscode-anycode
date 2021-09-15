/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Parser from '../../tree-sitter/tree-sitter';
import Languages from '../languages';
import * as lsp from "vscode-languageserver";
import { DocumentStore } from "../documentStore";
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocumentItem } from 'vscode-languageserver';

export async function bootstrapWasm() {
	await Parser.init({
		locateFile() {
			return '/server/tree-sitter/tree-sitter.wasm';
		}
	});

	await Languages.init([
		{ languageId: 'csharp', wasmUri: '/server/tree-sitter-c_sharp.wasm', suffixes: [] },
		{ languageId: 'c', wasmUri: '/server/tree-sitter-c.wasm', suffixes: [] },
		{ languageId: 'cpp', wasmUri: '/server/tree-sitter-cpp.wasm', suffixes: [] },
		{ languageId: 'go', wasmUri: '/server/tree-sitter-go.wasm', suffixes: [] },
		{ languageId: 'java', wasmUri: '/server/tree-sitter-java.wasm', suffixes: [] },
		{ languageId: 'php', wasmUri: '/server/tree-sitter-php.wasm', suffixes: [] },
		{ languageId: 'python', wasmUri: '/server/tree-sitter-python.wasm', suffixes: [] },
		{ languageId: 'rust', wasmUri: '/server/tree-sitter-rust.wasm', suffixes: [] },
		{ languageId: 'typescript', wasmUri: '/server/tree-sitter-typescript.wasm', suffixes: [] },
	]);
}

export function mock<T>(): { new(): T } {
	return function () { } as any;
}


export class TestDocumentStore extends DocumentStore {

	constructor(...docs: TextDocument[]) {
		super(
			new class extends mock<lsp.Connection>() {
				onDidOpenTextDocument(handler: lsp.NotificationHandler<lsp.DidOpenTextDocumentParams>) {
					for (let doc of docs) {
						handler({
							textDocument: {
								languageId: doc.languageId,
								uri: doc.uri,
								text: doc.getText(),
								version: doc.version
							}
						});
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

export class FixtureMarks {

	static readonly pattern = /\[[^\]]+\]/g;

	constructor(
		readonly start: number,
		readonly text: string
	) { }
}

export class Fixture {

	static async parse(uri: string, languageId: string): Promise<Fixture[]> {

		const res = await fetch(uri);
		const text = await res.text();

		const result: Fixture[] = [];
		const fixtures = text.split('---').filter(Boolean);

		for (let i = 0; i < fixtures.length; i++) {
			let text = fixtures[i];
			const marks: FixtureMarks[] = [];
			const parts = text.split(FixtureMarks.pattern);
			const idents = text.match(FixtureMarks.pattern)!;

			text = '';
			for (let i = 0; i < parts.length; i++) {
				text += parts[i];
				let ident = idents[i];
				if (ident) {
					let name = ident.slice(1, -1);
					marks.push(new FixtureMarks(text.length, name));
					text += name;
				}
			}
			result.push(new Fixture(
				String(i),
				TextDocument.create(`${uri}#${i}`, languageId, 1, text),
				marks
			));
		}
		return result;
	}

	constructor(
		readonly name: string,
		readonly document: TextDocument,
		readonly marks: FixtureMarks[]
	) { }
};
