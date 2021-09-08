/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Parser from '../../tree-sitter/tree-sitter';
import c_sharp from './queries/c_sharp';
import c from './queries/c';
import cpp from './queries/cpp';
import go from './queries/go';
import java from './queries/java';
import php from './queries/php';
import python from './queries/python';
import rust from './queries/rust';
import typescript from './queries/typescript';
import Languages from './languages';

export const enum QueryType {
	DocumentSymbols = 1,
	Usages = 2
}

export interface QueryModule {
	documentSymbols: string;
	usages?: string;
}

export abstract class Queries {

	private static readonly _queryModules = new Map<string, QueryModule>([
		['csharp', c_sharp],
		['c', c],
		['cpp', cpp],
		['go', go],
		['java', java],
		['php', php],
		['python', python],
		['rust', rust],
		['typescript', typescript],
	]);

	private static readonly _queryInstances = new Map<string, Parser.Query>();

	static get(languageId: string, type: QueryType): Parser.Query | undefined {

		const module = this._queryModules.get(languageId);
		if (!module) {
			// unknown language or invalid query (deleted after failed parse attempt)
			return undefined;
		}

		const source: string[] = [];
		if (type & QueryType.DocumentSymbols) {
			source.push(module.documentSymbols);
		}
		if (type & QueryType.Usages && module.usages) {
			source.push(module.usages);
		}
		const key = `${languageId}/${type}.join()`;

		let query = this._queryInstances.get(key);
		if (!query) {
			try {
				query = Languages.get(languageId)!.query(source.join('\n'));
				this._queryInstances.set(key, query);
			} catch (e) {
				console.log(languageId, e);
				this._queryModules.delete(languageId);
			}
		}
		return query;
	}
};
