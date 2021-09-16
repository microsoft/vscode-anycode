/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Parser from '../tree-sitter/tree-sitter';
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

export type QueryModule = {
	outline?: string;
	comments?: string;
	folding?: string;
	locals?: string;
	identifiers?: string;
};

export type QueryType = keyof QueryModule;

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

	static get(languageId: string, type: QueryType, ...more: QueryType[]): Parser.Query {

		const module = this._queryModules.get(languageId);
		if (!module) {
			// unknown language or invalid query (deleted after failed parse attempt)
			return Languages.get(languageId)!.query('');
		}

		const source = [type, ...more].map(type => module[type] ?? '').join('\n').trim();
		const key = `${languageId}/${source}`;

		let query = this._queryInstances.get(key);
		if (!query) {
			try {
				query = Languages.get(languageId)!.query(source);
			} catch (e) {
				query = Languages.get(languageId)!.query('');
				console.warn(languageId, e);
			}
		}
		this._queryInstances.set(key, query);
		return query;
	}

	static supportedLanguages(type: QueryType, ...more: QueryType[]): string[] {
		const types = new Set([type, ...more]);
		const result: string[] = [];
		for (let [language, module] of this._queryModules) {
			for (let type of types) {
				if (module[type]) {
					result.push(language);
					break;
				}
			}
		}
		return result;
	}
};
