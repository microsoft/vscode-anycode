/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextEncoder } from "util";
import { Connection, SymbolKind } from "vscode-languageserver";
import { SymbolInfoStorage, SymbolInfo } from "../features/symbolIndex";

export class FileSymbolStorage implements SymbolInfoStorage {

	private readonly _data = new Map<string, Array<string | number>>();
	private readonly _encoder = new TextEncoder();
	private readonly _decoder = new TextDecoder();

	constructor(private readonly _connection: Connection) { }

	insert(uri: string, info: Map<string, SymbolInfo>): void {
		const flatInfo: Array<string | number> = [];
		for (let [word, i] of info) {
			flatInfo.push(word);
			flatInfo.push(i.definitions.size);
			flatInfo.push(...i.definitions);
			flatInfo.push(...i.usages);
		}
		this._data.set(uri, flatInfo);
		this._saveSoon();
	}

	async delete(uris: Set<string>): Promise<void> {
		for (const uri of uris) {
			this._data.delete(uri);
		}
		this._saveSoon();
	}

	private _saveTimer: number | undefined | any;

	private _saveSoon() {
		clearTimeout(this._saveTimer);
		this._saveTimer = setTimeout(() => { this.flush(); }, 50);
	}

	flush() {
		const raw = JSON.stringify(Array.from(this._data.entries()));
		const bytes = this._encoder.encode(raw);
		this._connection.sendRequest('persisted/write', bytes).catch(err => console.error(err));
	}

	async getAll(): Promise<Map<string, Map<string, SymbolInfo>>> {

		this._data.clear();

		const result = new Map<string, Map<string, SymbolInfo>>();
		try {
			const bytes = await this._connection.sendRequest<Uint8Array>('persisted/read');
			const raw = this._decoder.decode(bytes);
			const data = <[string, Array<string | number>][]>JSON.parse(raw);

			for (let [uri, flatInfo] of data) {
				this._data.set(uri, flatInfo);
				const info = new Map<string, SymbolInfo>();
				result.set(uri, info);
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
			}
		} catch (err) {
			console.error(err);
		}
		return result;
	}
}
