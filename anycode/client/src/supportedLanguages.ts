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

	static async init(context: vscode.ExtensionContext): Promise<SupportedLanguages> {

		type Contribution = { ['anycode-languages']: JSONAnycodeLanguage | JSONAnycodeLanguage[] };

		const infos: LanguageInfo[] = [];

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
					queries = await this._readQueryPath(extension, lang.queryPaths);
				} catch (err) {
					console.warn(`INVALID anycode-language queryPaths from ${extension.id}`, err);
					continue;
				}

				infos.push(new LanguageInfo(
					lang.languageId,
					vscode.Uri.joinPath(extension.extensionUri, lang.grammarPath).toString(),
					lang.extensions,
					queries
				));
			}
		}

		return new SupportedLanguages(infos, context);
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

	private readonly _onDidChange = new vscode.EventEmitter<this>();
	readonly onDidChange = this._onDidChange.event;

	private readonly _all: readonly LanguageInfo[];
	private _tuples?: Map<LanguageInfo, FeatureConfig>;

	private readonly _disposable: vscode.Disposable;

	constructor(infos: readonly LanguageInfo[], context: vscode.ExtensionContext) {
		this._all = [
			...infos,
			new LanguageInfo('c', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-c.wasm').toString(), ['c', 'i']),
			new LanguageInfo('cpp', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-cpp.wasm').toString(), ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hh', 'hxx', 'h++', 'h', 'ii', 'ino', 'inl', 'ipp', 'ixx', 'hpp.in', 'h.in']),
			new LanguageInfo('csharp', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-c_sharp.wasm').toString(), ['cs']),
			new LanguageInfo('go', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-go.wasm').toString(), ['go']),
			new LanguageInfo('php', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-php.wasm').toString(), ['php', 'php4', 'php5', 'phtml', 'ctp']),
			new LanguageInfo('python', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-python.wasm').toString(), ['py', 'rpy', 'pyw', 'cpy', 'gyp', 'gypi', 'pyi', 'ipy']),
			new LanguageInfo('typescript', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-typescript.wasm').toString(), ['ts', 'tsx', 'js', 'jsx']),
		];


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

	getSupportedLanguages(): ReadonlyMap<LanguageInfo, FeatureConfig> {

		if (!this._tuples) {
			this._tuples = new Map();

			for (let info of this._all) {
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

	getSupportedLanguagesAsSelector(): string[] {
		return Array.from(this.getSupportedLanguages().keys()).map(info => info.languageId);
	}
}
