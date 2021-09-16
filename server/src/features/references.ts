/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { SymbolIndex } from './symbolIndex';
import { Trees } from '../trees';
import { DocumentStore } from '../documentStore';
import { Locals } from './fileInfo';
import { Queries } from '../queries';

export class ReferencesProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private readonly _symbols: SymbolIndex
	) { }

	register(connection: lsp.Connection) {
		connection.client.register(lsp.ReferencesRequest.type, { documentSelector: Queries.supportedLanguages('locals') });
		connection.onRequest(lsp.ReferencesRequest.type, this.provideReferences.bind(this));
	}

	async provideReferences(params: lsp.ReferenceParams): Promise<lsp.Location[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		// find references inside file
		const info = Locals.create(document, this._trees);
		const scope = info.root.findScope(params.position);
		const anchor = scope.findDefinitionOrUsage(params.position);
		if (anchor) {
			const definitions = scope.findDefinitions(anchor.name);
			if (definitions.length > 0) {
				const result: lsp.Location[] = [];
				for (let def of definitions) {
					if (params.context.includeDeclaration) {
						result.push(lsp.Location.create(document.uri, def.range));
					}
				}
				const usages = scope.findUsages(anchor.name);
				for (let usage of usages) {
					result.push(lsp.Location.create(document.uri, usage.range));
				}
				return result;
			}
		}

		// the definition the "anchor" was found or wasn't marked a local/argument and
		// therefore we try to find all symbols that match this name
		return await this._findGlobalReferences(params);

	}

	private async _findGlobalReferences(params: lsp.ReferenceParams): Promise<lsp.Location[]> {

		const result: lsp.Location[] = [];
		// @todo@jrieken support "global" references
		return result;
	}
}
