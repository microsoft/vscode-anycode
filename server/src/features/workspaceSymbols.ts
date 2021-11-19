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
		const result: lsp.SymbolInformation[] = [];

		await this._symbols.update();

		const all = this._symbols.definitions.query(params.query);

		out: for (let [name, map] of all) {
			for (let [uri, kinds] of map) {
				for (let kind of kinds) {
					const newLen = result.push(lsp.SymbolInformation.create(name, kind, lsp.Range.create(0, 0, 0, 0), uri));
					if (newLen > 20_000) {
						break out;
					}
				}
			}
		}

		return result;
	}

	async resolveWorkspaceSymbol() {
		// TODO@jrieken fill in location
	}
}
