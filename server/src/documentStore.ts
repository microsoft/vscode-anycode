/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import Languages from './languages';
import { LRUMap } from './util/lruMap';

export interface TextDocumentChange2 {
	document: TextDocument,
	changes: {
		range: lsp.Range;
		rangeOffset: number;
		rangeLength: number;
		text: string;
	}[]
}

export class DocumentStore extends TextDocuments<TextDocument> {

	private readonly _onDidChangeContent2 = new lsp.Emitter<TextDocumentChange2>();
	readonly onDidChangeContent2 = this._onDidChangeContent2.event;

	private readonly _decoder = new TextDecoder();
	private readonly _fileDocuments: LRUMap<string, Promise<TextDocument>>;

	constructor(private readonly _connection: lsp.Connection) {
		super({
			create: TextDocument.create,
			update: (doc, changes, version) => {
				let result: TextDocument;
				let incremental = true;
				let event: TextDocumentChange2 = { document: doc, changes: [] };

				for (const change of changes) {
					if (!lsp.TextDocumentContentChangeEvent.isIncremental(change)) {
						incremental = false;
						break;
					}
					const rangeOffset = doc.offsetAt(change.range.start);
					event.changes.push({
						text: change.text,
						range: change.range,
						rangeOffset,
						rangeLength: change.rangeLength ?? doc.offsetAt(change.range.end) - rangeOffset,
					});
				}
				result = TextDocument.update(doc, changes, version);
				if (incremental) {
					this._onDidChangeContent2.fire(event);
				}
				return result;
			}
		});

		this._fileDocuments = new LRUMap<string, Promise<TextDocument>>({
			size: 200,
			dispose: _entries => { }
		});

		super.listen(_connection);

		_connection.onNotification('file-cache/remove', uri => this._fileDocuments.delete(uri));
	}

	async retrieve(uri: string): Promise<TextDocument> {
		let result = this.get(uri);
		if (result) {
			return result;
		}
		let promise = this._fileDocuments.get(uri);
		if (!promise) {
			promise = this._requestDocument(uri);
			this._fileDocuments.set(uri, promise);
		}
		return promise;
	}

	private async _requestDocument(uri: string): Promise<TextDocument> {
		const reply = await this._connection.sendRequest<ArrayBuffer>('file/read', uri);
		return TextDocument.create(uri, Languages.getLanguageIdByUri(uri), 1, this._decoder.decode(reply));
	}

}
