/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Connection, SymbolInformation, WorkspaceSymbolParams } from 'vscode-languageserver';
import { StopWatch } from '../common';
import { SymbolIndex } from './symbolIndex';

export class WorkspaceSymbol {

	constructor(private readonly _symbols: SymbolIndex) { }

	register(connection: Connection) {
		connection.onWorkspaceSymbol(this.provideWorkspaceSymbols.bind(this));
	}

	async provideWorkspaceSymbols(params: WorkspaceSymbolParams): Promise<SymbolInformation[]> {
		const result: SymbolInformation[][] = [];

		await this._symbols.update();

		const sw = new StopWatch();
		const all = this._symbols.definitions.query(Array.from(params.query));
		for (let [, symbols] of all) {
			result.push(Array.from(symbols));
		}
		sw.elapsed('WORKSPACE symbol search');

		return result.flat();
	}
}
