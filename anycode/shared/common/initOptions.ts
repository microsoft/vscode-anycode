/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


export interface Queries {
	readonly comments?: string;
	readonly folding?: string;
	readonly identifiers?: string;
	readonly locals?: string;
	readonly outline?: string;
	readonly references?: string;
}

export class LanguageInfo {
	constructor(
		readonly extensionId: string,
		readonly languageId: string,
		readonly suffixes: string[],
		readonly suppressedBy: string[],
		readonly queryInfo: Queries
	) { }
}

export class Language {

	private _data?: Promise<LanguageData>;

	constructor(
		readonly info: LanguageInfo,
		private readonly _loadData: () => Promise<LanguageData>
	) { }

	fetchLanguageData() {
		this._data ??= this._loadData();
		return this._data;
	}
}

export class LanguageData {
	constructor(
		readonly grammarBase64: string,
		readonly queries: Queries,
	) { }
}

export interface FeatureConfig {
	completions?: boolean;
	definitions?: boolean;
	references?: boolean;
	highlights?: boolean;
	outline?: boolean;
	folding?: boolean;
	workspaceSymbols?: boolean;
	diagnostics?: boolean;
};

export type LanguageConfiguration = [LanguageInfo, FeatureConfig][];

export type InitOptions = {
	treeSitterWasmUri: string;
	supportedLanguages: LanguageConfiguration,
	databaseName: string;
};
