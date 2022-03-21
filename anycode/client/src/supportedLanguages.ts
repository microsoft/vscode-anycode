/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface Queries {
	comments?: string;
	folding?: string;
	identifiers?: string;
	locals?: string;
	outline?: string;
	references?: string;
}

export class LanguageInfo {
	constructor(
		readonly languageId: string,
		readonly wasmUri: string,
		readonly suffixes: string[],
		readonly queries?: Queries
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
	[key: string]: boolean | undefined;
};

type JSONQueryPaths = {
	comments?: string;
	folding?: string;
	identifiers?: string;
	locals?: string;
	outline?: string;
	references?: string;
};

type JSONAnycodeLanguage = {
	grammarPath: string;
	languageId: string;
	extensions: string[];
	queryPaths: JSONQueryPaths
};

function validateAnycodeLanguage(lang: JSONAnycodeLanguage): boolean {
	if (typeof lang.grammarPath !== 'string') {
		return false;
	}
	if (typeof lang.languageId !== 'string') {
		return false;
	}
	if (!Array.isArray(lang.extensions)) {
		return false;
	}
	if (!lang.queryPaths || typeof lang.queryPaths !== 'object') {
		return false;
	}
	return true;
}

export class SupportedLanguages {

	private readonly _onDidChange = new vscode.EventEmitter<this>();
	readonly onDidChange = this._onDidChange.event;

	private _tuples?: Map<LanguageInfo, FeatureConfig>;

	private readonly _disposable: vscode.Disposable;

	constructor() {

		// reset when extension or configuration changes
		this._disposable = vscode.Disposable.from(
			vscode.extensions.onDidChange(this._reset, this),
			vscode.workspace.onDidChangeConfiguration(e => {
				if (e.affectsConfiguration('anycode.language')) {
					this._reset();
				}
			})
		);
	}

	dispose(): void {
		this._onDidChange.dispose();
		this._disposable.dispose();
	}

	private _reset(): void {
		this._tuples = undefined;
		this._onDidChange.fire(this);
	}

	async getSupportedLanguages(): Promise<ReadonlyMap<LanguageInfo, FeatureConfig>> {

		if (!this._tuples) {

			const languageInfos = await this._readLanguageInfos();

			this._tuples = new Map();

			for (const info of languageInfos.values()) {
				const config = vscode.workspace.getConfiguration('anycode', { languageId: info.languageId });
				const featureConfig: FeatureConfig = { ...config.get<FeatureConfig>(`language.features`) };
				const empty = Object.keys(featureConfig).every(key => !featureConfig[key]);
				if (empty) {
					continue;
				}

				this._tuples.set(info, featureConfig);
			}
		}

		return this._tuples;
	}

	async getSupportedLanguagesAsSelector(): Promise<string[]> {
		const infos = await this.getSupportedLanguages();
		return Array.from(infos.keys()).map(info => info.languageId);
	}

	async _readLanguageInfos(): Promise<ReadonlyMap<string, LanguageInfo>> {

		type Contribution = { ['anycode-languages']: JSONAnycodeLanguage | JSONAnycodeLanguage[] };

		const result = new Map<string, LanguageInfo>();

		for (const extension of vscode.extensions.all) {

			let languages = (<Contribution | undefined>extension.packageJSON.contributes)?.['anycode-languages'];
			if (!languages) {
				// not for me...
				continue;
			}

			if (!Array.isArray(languages)) {
				languages = [languages];
			}

			for (const lang of languages) {

				if (!validateAnycodeLanguage(lang)) {
					console.warn(`INVALID anycode-language contribution from ${extension.id}`, lang);
					continue;
				}

				let queries: Queries;

				try {
					queries = await SupportedLanguages._readQueryPath(extension, lang.queryPaths);
				} catch (err) {
					console.warn(`INVALID anycode-language queryPaths from ${extension.id}`, err);
					continue;
				}

				const grammarUri = vscode.Uri.joinPath(extension.extensionUri, lang.grammarPath);
				try {
					vscode.workspace.fs.stat(grammarUri);
				} catch (err) {
					console.warn(`INVALID anycode-language grammerPath from ${extension.id}`, err);
					continue;
				}

				const info = new LanguageInfo(
					lang.languageId,
					grammarUri.toString(),
					lang.extensions,
					queries
				);

				if (result.has(info.languageId)) {
					console.info(`extension ${extension.id} OVERWRITES language info for ${info.languageId}`);
				}
				result.set(info.languageId, info);
			}
		}
		return result;
	}

	private static async _readQueryPath(extension: vscode.Extension<any>, paths: JSONQueryPaths): Promise<Queries> {

		const decoder = new TextDecoder();
		const result: Queries = {};
		if (paths.comments) {
			result.comments = decoder.decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(extension.extensionUri, paths.comments)));
		}
		if (paths.folding) {
			result.folding = decoder.decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(extension.extensionUri, paths.folding)));
		}
		if (paths.identifiers) {
			result.identifiers = decoder.decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(extension.extensionUri, paths.identifiers)));
		}
		if (paths.locals) {
			result.locals = decoder.decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(extension.extensionUri, paths.locals)));
		}
		if (paths.outline) {
			result.outline = decoder.decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(extension.extensionUri, paths.outline)));
		}
		if (paths.references) {
			result.references = decoder.decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(extension.extensionUri, paths.references)));
		}
		return result;
	}

}
