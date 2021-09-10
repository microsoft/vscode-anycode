/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { SymbolIndex } from './symbolIndex';
import { Trees } from '../trees';
import { DocumentStore } from '../documentStore';
import { Definition, FileInfo, Usage } from './fileInfo';

export class ReferencesProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private readonly _symbols: SymbolIndex
	) { }

	register(connection: lsp.Connection) {
		connection.onReferences(this.provideReferences.bind(this));
	}

	async provideReferences(params: lsp.ReferenceParams): Promise<lsp.Location[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		const info = FileInfo.detailed(document, this._trees);
		const scope = info.root.findScope(params.position);

		const anchor = scope.findUsage(params.position) ?? scope.findDefinition(params.position);
		if (!anchor) {
			return [];
		}
		const result: lsp.Location[] = [];
		const usages = scope.findUsages(anchor.name);
		for (let usage of usages) {
			result.push(lsp.Location.create(document.uri, usage.range));
		}

		let isScopedDefinition = false;
		const definitions = scope.findDefinitions(anchor.name);
		for (let def of definitions) {
			if (params.context.includeDeclaration) {
				result.push(lsp.Location.create(document.uri, def.range));
			}
			if (def.scoped) {
				isScopedDefinition = true;
			}
		}

		if (!isScopedDefinition) {
			// the definition the "anchor" was found or wasn't marked a local/argument and
			// therefore we try to find all symbols that match this name
			this._fillInGlobalReferences(anchor, params.context.includeDeclaration, result);
		}

		return result;
	}

	private async _fillInGlobalReferences(anchor: Usage | Definition, includeDefinition: boolean, bucket: lsp.Location[]) {
		await this._symbols.update();

		const usages = this._symbols.usages.get(anchor.name);
		const symbols = this._symbols.symbols.get(anchor.name);
		if (!usages && !symbols) {
			return;
		}

		if (usages) {
			for (let usage of usages) {
				bucket.push(usage);
			}
		}

		if (symbols) {
			for (let symbol of symbols) {
				bucket.push(lsp.Location.create(symbol.location.uri, symbol.location.range));
			}
		}
	}
}
