/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { Queries, LanguageInfo, FeatureConfig } from '../../../shared/common/initOptions';

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
	queryPaths: JSONQueryPaths;
	suppressedBy?: string[];
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
	if (lang.suppressedBy && !Array.isArray(lang.suppressedBy)) {
		return false;
	}
	return true;
}

export class SupportedLanguages {

	private readonly _onDidChange = new vscode.EventEmitter<this>();
	readonly onDidChange = this._onDidChange.event;

	private _tuples?: Map<LanguageInfo, FeatureConfig>;

	private readonly _disposable: vscode.Disposable;

	constructor(private readonly _log: vscode.OutputChannel) {

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
				const empty = Object.keys(featureConfig).every(key => !(<Record<string, any>>featureConfig)[key]);
				if (empty) {
					this._log.appendLine(`[CONFIG] ignoring ${info.languageId} because configuration IS EMPTY`);
					continue;
				}

				if (info.suppressedBy) {
					const inspectConfig = config.inspect('language.features');
					const explicitlyEnabled = inspectConfig?.globalLanguageValue || inspectConfig?.workspaceLanguageValue || inspectConfig?.workspaceFolderLanguageValue;
					if (!explicitlyEnabled && info.suppressedBy.some(id => vscode.extensions.getExtension(id, true))) {
						this._log.appendLine(`[CONFIG] ignoring ${info.languageId} because it is SUPPRESSED by any of [${info.suppressedBy.join(', ')}]`);
						continue;
					}
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

		type Contribution = { ['anycodeLanguages']: JSONAnycodeLanguage | JSONAnycodeLanguage[] };

		const result = new Map<string, LanguageInfo>();
		const isWebWorker = 'importScripts' in globalThis;

		for (const extension of vscode.extensions.allAcrossExtensionHosts) {

			let languages = (<Contribution | undefined>extension.packageJSON.contributes)?.['anycodeLanguages'];
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

				if (extension.extensionUri.scheme === 'vscode-remote') {
					console.warn(`UNSUPPORTED extension location from ${extension.id}`, extension.extensionUri.toString());
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
					isWebWorker ? grammarUri.toString() : grammarUri.fsPath,
					lang.extensions,
					queries,
					lang.suppressedBy
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
		type Writeable<T> = { -readonly [P in keyof T]: Writeable<T[P]> };
		const decoder = new TextDecoder();
		const result: Writeable<Queries> = {};
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
