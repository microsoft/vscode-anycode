/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Connection, Disposable, TextDocuments } from 'vscode-languageserver';
import { IDocument, isInteresting } from './common';
import { LRUMap } from './util/lruMap';
import { TextDocument } from 'vscode-languageserver-textdocument';


export class FileQueueAndDocuments {

	private readonly _queue = new Set<string>();
	private readonly _disposables: Disposable[] = [];

	private readonly _decoder = new TextDecoder();
	private readonly _documentCache = new LRUMap<string, IDocument>(200);

	// readonly init: Promise<void>;

	constructor(
		private readonly _connection: Connection,
		private readonly _textDocuments: TextDocuments<TextDocument>
	) {

		_textDocuments.all().forEach(d => this.enqueue(d.uri));
		this._disposables.push(_textDocuments.onDidOpen(e => this.enqueue(e.document.uri)));
		this._disposables.push(_textDocuments.onDidChangeContent(e => this.enqueue(e.document.uri)));

		// --- update of index
		_connection.onNotification('file/queue/add', uri => this.enqueue(uri));
		_connection.onNotification('file/queue/remove', uri => {
			this._queue.delete(uri);
			this._documentCache.delete(uri);
		});
		_connection.onNotification('file/queue/update', uri => {
			this.enqueue(uri);
			this._documentCache.delete(uri);
		});
	}

	dispose() {
		this._disposables.forEach(d => d.dispose());
		this._queue.clear();
	}

	// --- queue stuff

	enqueue(uri: string): void {
		if (!isInteresting(uri)) {
			return;
		}
		if (!this._queue.has(uri)) {
			this._queue.add(uri);
		}
	}

	consume(): string[] {
		const result = Array.from(this._queue.values());
		this._queue.clear();
		return result;
	}

	// --- documents

	async getOrLoadDocument(uri: string): Promise<IDocument> {
		let doc: IDocument | undefined = this._textDocuments.get(uri);
		if (!doc) {
			// not open
			doc = await this._loadDocumentWithCache(uri);
		}
		return doc;
	}

	private async _loadDocumentWithCache(uri: string): Promise<IDocument> {
		let doc = this._documentCache.get(uri.toString());
		if (!doc) {
			doc = await this._loadDocument(uri);
			this._documentCache.set(uri.toString(), doc);
			this._documentCache.cleanup();
		}
		return doc;
	}

	private async _loadDocument(uri: string): Promise<IDocument> {
		type ResponseData = { data: Uint8Array; languageId: string; };
		const reply = await this._connection.sendRequest<ResponseData>('file/read', uri);
		return TextDocument.create(uri, reply.languageId, 1, this._decoder.decode(reply.data));
	}
}
