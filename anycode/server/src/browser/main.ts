/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser';
import { MemorySymbolStorage, SymbolInfoStorage } from '../common/features/symbolIndex';
import { IStorageFactory, startServer } from '../common/server';
import { IndexedDBSymbolStorage } from './storage';

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

const factory: IStorageFactory = {
	async create(name) {
		try {
			const result = new IndexedDBSymbolStorage(name);
			await result.open();
			return result;
		} catch (e) {
			console.error('FAILED to create indexedDB-based storage, using volatile in-memory storage INSTEAD');
			return new MemorySymbolStorage();
		}
	},
	async destroy(obj: SymbolInfoStorage) {
		if (obj instanceof IndexedDBSymbolStorage) {
			await obj.close();
		}
	}
};

startServer(connection, factory);
