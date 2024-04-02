/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import Parser, { Language } from 'web-tree-sitter';
import { decodeBase64 } from '../../../shared/common/base64';
import { FeatureConfig, LanguageConfiguration, LanguageData } from '../../../shared/common/initOptions';

export type QueryModule = {
	outline?: string;
	comments?: string;
	folding?: string;
	locals?: string;
	identifiers?: string;
	references?: string;
};

export type QueryType = keyof QueryModule;

const _queryModules = new Map<string, QueryModule>();

interface LanguageFuture {
	promise: Promise<Parser.Language | undefined>;
	resolve(language: Promise<Parser.Language>): void;
}

export default abstract class Languages {

	private static readonly _languageInstances = new Map<string, LanguageFuture>();
	private static readonly _languageIdByLanguage = new Map<Parser.Language, string>();

	private static readonly _queryInstances = new Map<string, Parser.Query>();

	private static readonly _configurations = new Map<string, FeatureConfig>();
	private static _langConfiguration: LanguageConfiguration;

	static init(langConfiguration: LanguageConfiguration): void {
		this._langConfiguration = langConfiguration;
		for (const [entry, config] of langConfiguration) {
			this._configurations.set(entry.languageId, config);

			let resolve: (p: Promise<Parser.Language | undefined>) => void = () => { };
			let promise = new Promise<Parser.Language | undefined>((_resolve) => {
				resolve = async p => {
					let language: Language | undefined;
					try {
						language = await p;
					} catch (err) {
						console.error(`FAILED to load grammar for language ${entry.languageId}`);
						console.error(err);
					}

					if (language) {
						this._languageIdByLanguage.set(language, entry.languageId);
						_resolve(language);
					} else {
						this._languageInstances.delete(entry.languageId);
						_resolve(undefined);
					}
				};
			});
			this._languageInstances.set(entry.languageId, { promise, resolve });
		}
	}

	static setLanguageData(languageId: string, data: LanguageData) {

		// set language instance
		const future = this._languageInstances.get(languageId);
		future?.resolve(Parser.Language.load(decodeBase64(data.grammarBase64)));

		// set queries
		_queryModules.set(languageId, data.queries);
	}

	static async getLanguage(languageId: string): Promise<Parser.Language | undefined> {
		let infoOrLanguage = this._languageInstances.get(languageId);
		if (infoOrLanguage === undefined) {
			console.warn(`UNKNOWN languages: '${languageId}'`);
			return undefined;
		}
		return infoOrLanguage.promise;
	}

	static allAsSelector(): string[] {
		return [...this._languageInstances.keys()];
	}

	static getQuery(language: Language, type: QueryType, strict = false): Parser.Query {

		const languageId = this._languageIdByLanguage.get(language)!;
		const module = _queryModules.get(languageId);
		if (!module) {
			// unknown language or invalid query (deleted after failed parse attempt)
			return language.query('');
		}

		const source = module[type] ?? '';
		const key = `${languageId}/${type}`;

		let query = this._queryInstances.get(key);
		if (!query) {
			try {
				query = language.query(source);
			} catch (e) {
				query = language.query('');
				console.error(languageId, e);
				console.log(language);
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
		for (const [info] of this._langConfiguration) {
			for (const type of types) {
				if (info.queryInfo[type] && this._configurations.get(info.languageId)?.[feature]) {
					result.push(info.languageId);
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
