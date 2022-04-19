/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SymbolKind } from "vscode-languageserver";
import { SymbolInfoStorage, SymbolInfo } from "../features/symbolIndex";

export class IndexedDBSymbolStorage implements SymbolInfoStorage {

	private readonly _version = 1;
	private readonly _store = 'fileSymbols';
	private _db?: IDBDatabase;

	constructor(private readonly _name: string) { }

	async open() {

		if (this._db) {
			return;
		}

		await new Promise((resolve, reject) => {
			const request = indexedDB.open(this._name, this._version);
			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(this._store)) {
					console.error(`Error while opening IndexedDB. Could not find '${this._store}' object store`);
					return resolve(this._delete(db).then(() => this.open()));
				} else {
					resolve(undefined);
					this._db = db;
				}
			};
			request.onupgradeneeded = () => {
				const db = request.result;
				if (db.objectStoreNames.contains(this._store)) {
					db.deleteObjectStore(this._store);
				}
				db.createObjectStore(this._store);
			};
		});
	}

	async close(): Promise<void> {
		if (this._db) {
			await this._bulkInsert();
			this._db.close();
		}
	}

	private _delete(db: IDBDatabase): Promise<void> {
		return new Promise((resolve, reject) => {
			// Close any opened connections
			db.close();

			// Delete the db
			const deleteRequest = indexedDB.deleteDatabase(this._name);
			deleteRequest.onerror = () => reject(deleteRequest.error);
			deleteRequest.onsuccess = () => resolve();
		});
	}

	private _insertQueue = new Map<string, Array<string | number>>();
	private _insertHandle: number | undefined | any;

	insert(uri: string, info: Map<string, SymbolInfo>) {

		const flatInfo: Array<string | number> = [];
		for (let [word, i] of info) {
			flatInfo.push(word);
			flatInfo.push(i.definitions.size);
			flatInfo.push(...i.definitions);
			flatInfo.push(...i.usages);
		}

		this._insertQueue.set(uri, flatInfo);
		clearTimeout(this._insertHandle);
		this._insertHandle = setTimeout(() => {
			this._bulkInsert().catch(err => {
				console.error(err);
			});
		}, 50);
	}

	private async _bulkInsert(): Promise<void> {
		if (this._insertQueue.size === 0) {
			return;
		}
		return new Promise((resolve, reject) => {
			if (!this._db) {
				return reject(new Error('invalid state'));
			}
			const t = this._db.transaction(this._store, 'readwrite');
			const toInsert = new Map(this._insertQueue);
			this._insertQueue.clear();
			for (let [uri, data] of toInsert) {
				t.objectStore(this._store).put(data, uri);
			}
			t.oncomplete = () => resolve(undefined);
			t.onerror = (err) => reject(err);
		});
	}

	getAll(): Promise<Map<string, Map<string, SymbolInfo>>> {

		return new Promise((resolve, reject) => {
			if (!this._db) {
				return reject(new Error('invalid state'));
			}
			const entries = new Map<string, Map<string, SymbolInfo>>();
			const t = this._db.transaction(this._store, 'readonly');
			const store = t.objectStore(this._store);
			const cursor = store.openCursor();
			cursor.onsuccess = () => {
				if (!cursor.result) {
					resolve(entries);
					return;
				}
				const info = new Map<string, SymbolInfo>();
				const flatInfo = (<Array<string | number>>cursor.result.value);
				for (let i = 0; i < flatInfo.length;) {
					let word = (<string>flatInfo[i]);
					let defLen = (<number>flatInfo[++i]);
					let kindStart = ++i;

					for (; i < flatInfo.length && typeof flatInfo[i] === 'number'; i++) { ; }

					info.set(word, {
						definitions: new Set(<SymbolKind[]>flatInfo.slice(kindStart, kindStart + defLen)),
						usages: new Set(<SymbolKind[]>flatInfo.slice(kindStart + defLen, i))
					});
				}

				entries.set(String(cursor.result.key), info);
				cursor.result.continue();
			};

			cursor.onerror = () => reject(cursor.error);
			t.onerror = () => reject(t.error);
		});
	}

	delete(uris: Set<string>): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this._db) {
				return reject(new Error('invalid state'));
			}
			const t = this._db.transaction(this._store, 'readwrite');
			const store = t.objectStore(this._store);

			for (const uri of uris) {
				const request = store.delete(uri);
				request.onerror = e => console.error(e);
			}
			t.oncomplete = () => resolve(undefined);
			t.onerror = (err) => reject(err);
		});
	}
}
