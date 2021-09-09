/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Parser from './tree-sitter/tree-sitter';

export default abstract class Languages {

	private static _languages = new Map<string, Parser.Language>();

	static async init(langInfo: { languageId: string, wasmUri: string, suffixes: string[] }[]) {
		for (let entry of langInfo) {
			const lang = await Parser.Language.load(entry.wasmUri);
			this._languages.set(entry.languageId, lang);
		}
	}

	static get(languageId: string): Parser.Language | undefined {
		let result = this._languages.get(languageId);
		if (!result) {
			console.warn(`UNKNOWN languages: '${languageId}'`);
			return undefined;
		}
		return result;
	}
}
