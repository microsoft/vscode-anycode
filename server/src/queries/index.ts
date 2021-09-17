/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Parser from '../../tree-sitter/tree-sitter';
import c_sharp from './c_sharp';
import c from './c';
import cpp from './cpp';
import go from './go';
import java from './java';
import php from './php';
import python from './python';
import rust from './rust';
import typescript from './typescript';
import Languages from '../languages';

export type QueryModule = {
	outline?: string;
	comments?: string;
	folding?: string;
	locals?: string;
	identifiers?: string;
	references?: string;
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

	static get(languageId: string, type: QueryType, strict = false): Parser.Query {

		const module = this._queryModules.get(languageId);
		if (!module) {
			// unknown language or invalid query (deleted after failed parse attempt)
			return Languages.get(languageId)!.query('');
		}

		const source = module[type] ?? '';
		const key = `${languageId}/${type}`;

		let query = this._queryInstances.get(key);
		if (!query) {
			try {
				query = Languages.get(languageId)!.query(source);
			} catch (e) {
				query = Languages.get(languageId)!.query('');
				console.error(languageId, e);
				if (strict) {
					throw e;
				}
			}
			this._queryInstances.set(key, query);
		}
		return query;
	}

	static supportedLanguages(type: QueryType, ...more: QueryType[]): string[] {
		const result: string[] = [];
		const types = new Set([type, ...more]);
		for (let languageId of Languages.allAsSelector()) { // USE actually supported languages
			const module = this._queryModules.get(languageId);
			if (!module) {
				console.warn(`${languageId} NOT supported by queries`);
				continue;
			}
			for (let type of types) {
				if (module[type]) {
					result.push(languageId);
					break;
				}
			}
		}
		return result;
	}
};
