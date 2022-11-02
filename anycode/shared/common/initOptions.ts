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
		readonly wasmUri: string,
		readonly suffixes: string[],
		readonly queries?: Queries,
		readonly suppressedBy?: string[]
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
