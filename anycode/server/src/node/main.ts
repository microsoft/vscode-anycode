/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection } from 'vscode-languageserver/node';
import { SymbolInfoStorage } from '../features/symbolIndex';
import { IStorageFactory, startServer } from '../server';
import { FileSymbolStorage } from './storage';

process.on('unhandledRejection', (e: any) => {
	connection.console.error(`Unhandled exception`);
	connection.console.error(e);
});

const connection = createConnection();

const factory: IStorageFactory = {
	async create(name) {
		return new FileSymbolStorage(connection);
	},
	async destroy(obj: SymbolInfoStorage) {
		if (obj instanceof FileSymbolStorage) {
			obj.flush();
		}
	}
};

startServer(connection, factory);
