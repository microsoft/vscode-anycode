/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export class LanguageInfo {
	constructor(
		readonly languageId: string,
		readonly wasmUri: string,
		readonly suffixes: string[]
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

export class SupportedLanguages {

	private readonly _overrideConfigurations = new Map<string, { extension: string, config: FeatureConfig }>([
		['python', { extension: 'ms-python.python', config: { completions: false, definitions: true, diagnostics: false, folding: false, highlights: false, outline: false, references: false, workspaceSymbols: true } }],
		['typescript', { extension: 'vscode.typescript-language-features', config: { completions: false, definitions: true, diagnostics: false, folding: false, highlights: false, outline: false, references: false, workspaceSymbols: true } }]
	]);

	private readonly _onDidChange = new vscode.EventEmitter<this>();
	readonly onDidChange = this._onDidChange.event;

	private readonly _all: readonly LanguageInfo[];
	private _tuples?: Map<LanguageInfo, FeatureConfig>;

	private readonly _disposable: vscode.Disposable;

	constructor(context: vscode.ExtensionContext) {
		this._all = [
			new LanguageInfo('c', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-c.wasm').toString(), ['c', 'i']),
			new LanguageInfo('cpp', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-cpp.wasm').toString(), ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hh', 'hxx', 'h++', 'h', 'ii', 'ino', 'inl', 'ipp', 'ixx', 'hpp.in', 'h.in']),
			new LanguageInfo('csharp', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-c_sharp.wasm').toString(), ['cs']),
			new LanguageInfo('go', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-go.wasm').toString(), ['go']),
			new LanguageInfo('java', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-java.wasm').toString(), ['java']),
			new LanguageInfo('php', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-php.wasm').toString(), ['php', 'php4', 'php5', 'phtml', 'ctp']),
			new LanguageInfo('python', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-python.wasm').toString(), ['py', 'rpy', 'pyw', 'cpy', 'gyp', 'gypi', 'pyi', 'ipy']),
			new LanguageInfo('rust', vscode.Uri.joinPath(context.extensionUri, './server/tree-sitter-rust.wasm').toString(), ['rs']),
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

				let overrideConfig: FeatureConfig | undefined;
				const overrideInfo = this._overrideConfigurations.get(info.languageId);
				if (overrideInfo && vscode.extensions.getExtension(overrideInfo.extension)) {
					overrideConfig = overrideInfo.config;
				}

				const featureConfig: FeatureConfig = {
					...config.get<FeatureConfig>(`language.features`),
					...overrideConfig,
				};

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
