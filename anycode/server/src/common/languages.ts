/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Parser from 'web-tree-sitter';
import { FeatureConfig, LanguageConfiguration } from '../../../shared/common/initOptions';

export type QueryModule = {
	outline?: string;
	comments?: string;
	folding?: string;
	locals?: string;
	identifiers?: string;
	references?: string;
};

export type QueryType = keyof QueryModule;


const _queryModules = new Map<string, QueryModule>([

]);

export default abstract class Languages {

	private static readonly _languageInstances = new Map<string, Parser.Language>();
	private static readonly _queryInstances = new Map<string, Parser.Query>();

	private static readonly _configurations = new Map<string, FeatureConfig>();
	private static _langConfiguration: LanguageConfiguration;

	static async init(langConfiguration: LanguageConfiguration) {
		this._langConfiguration = langConfiguration;
		for (const [entry, config] of langConfiguration) {
			const lang = await Parser.Language.load(entry.wasmUri);
			this._languageInstances.set(entry.languageId, lang);
			this._configurations.set(entry.languageId, config);

			if (entry.queries) {
				_queryModules.set(entry.languageId, entry.queries);
			}
		}
	}

	static getLanguage(languageId: string): Parser.Language | undefined {
		let result = this._languageInstances.get(languageId);
		if (!result) {
			console.warn(`UNKNOWN languages: '${languageId}'`);
			return undefined;
		}
		return result;
	}

	static allAsSelector(): string[] {
		return [...this._languageInstances.keys()];
	}


	static getQuery(languageId: string, type: QueryType, strict = false): Parser.Query {

		const module = _queryModules.get(languageId);
		if (!module) {
			// unknown language or invalid query (deleted after failed parse attempt)
			return this.getLanguage(languageId)!.query('');
		}

		const source = module[type] ?? '';
		const key = `${languageId}/${type}`;

		let query = this._queryInstances.get(key);
		if (!query) {
			try {
				query = this.getLanguage(languageId)!.query(source);
			} catch (e) {
				query = this.getLanguage(languageId)!.query('');
				console.error(languageId, e);
				if (strict) {
					throw e;
				}
			}
			this._queryInstances.set(key, query);
		}
		return query;
	}

	static getSupportedLanguages(feature: keyof FeatureConfig, types: QueryType[]): string[] {
		const result: string[] = [];
		for (let languageId of this._languageInstances.keys()) { // USE actually supported languages
			const module = _queryModules.get(languageId);
			if (!module) {
				console.warn(`${languageId} NOT supported by queries`);
				continue;
			}
			for (let type of types) {
				if (module[type] && this._configurations.get(languageId)?.[feature]) {
					result.push(languageId);
					break;
				}
			}
		}
		return result;
	}

	static getLanguageIdByUri(uri: string): string {
		let end = uri.lastIndexOf('?');
		if (end < 0) {
			end = uri.lastIndexOf('#');
		}
		if (end > 0) {
			uri = uri.substring(0, end);
		}
		const start = uri.lastIndexOf('.');
		const suffix = uri.substring(start + 1);
		for (let [info] of this._langConfiguration) {
			for (let candidate of info.suffixes) {
				if (candidate === suffix) {
					return info.languageId;
				}
			}
		}
		return `unknown/${uri}`;
	}
}
