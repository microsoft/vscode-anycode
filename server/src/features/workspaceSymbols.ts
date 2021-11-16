/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { SymbolIndex } from './symbolIndex';

export class WorkspaceSymbol {

	constructor(private readonly _symbols: SymbolIndex) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.WorkspaceSymbolRequest.type);
		connection.onRequest(lsp.WorkspaceSymbolRequest.type, this.provideWorkspaceSymbols.bind(this));
	}

	async provideWorkspaceSymbols(params: lsp.WorkspaceSymbolParams): Promise<lsp.SymbolInformation[]> {
		const result: lsp.SymbolInformation[][] = [];

		await this._symbols.update();

		const all = this._symbols.definitions.query(Array.from(params.query));
		let totalLen = 0;
		for (let [, symbols] of all) {
			const arr = Array.from(symbols);
			result.push(arr);
			totalLen += arr.length;

			if (totalLen > 20_000) {
				break;
			}
		}

		return result.flat();
	}
}
