/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Languages from '../../languages';
import * as lsp from "vscode-languageserver";
import { DocumentStore } from "../../documentStore";
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Trees } from '../../trees';

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

	static readonly pattern = /\[\[[^\]]+\]\]/g;

	constructor(
		readonly start: number,
		readonly text: string
	) { }
}

export class Fixture {

	static async parse(uri: string, languageId: string) {

		const res = await fetch(uri);
		const text = await res.text();

		const r = /.+###.*/gu;
		const names = text.match(r);
		const documents = text.split(r)
			.filter(Boolean)
			.map((value, i) => TextDocument.create(`${uri}#${i}`, languageId, 1, value));

		const store = new TestDocumentStore(...documents);
		const trees = new Trees(store);
		const query = Languages.getQuery(languageId, 'comments', true);

		const fixtures: Fixture[] = [];

		for (const doc of documents) {
			const tree = trees.getParseTree(doc);
			if (!tree) {
				throw new Error();
			}

			const name = names?.shift()?.replace(/^.+###/, '').trim() ?? doc.uri;
			if (name.includes('/SKIP/')) {
				continue;
			}

			const marks: FixtureMarks[] = [];
			const captures = query.captures(tree.rootNode);

			for (const capture of captures) {
				const start = capture.node.text.indexOf('^');
				if (start < 0) {
					continue;
				}

				const end = capture.node.text.lastIndexOf('^');

				for (let row = capture.node.startPosition.row - 1; row >= 0; row--) {
					let node = tree.rootNode.descendantForPosition({ row, column: start }, { row, column: end });
					if (query.captures(node).length > 0) {
						// skip stacked comments
						continue;
					}
					marks.push(new FixtureMarks(node.startIndex, node.text));
					break;
				}
			}

			fixtures.push(new Fixture(name, doc, marks));
		}

		trees.dispose();
		return fixtures;
	}

	constructor(
		readonly name: string,
		readonly document: TextDocument,
		readonly marks: FixtureMarks[]
	) { }
};
