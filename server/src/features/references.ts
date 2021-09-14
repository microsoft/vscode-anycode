/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { SymbolIndex } from './symbolIndex';
import { Trees } from '../trees';
import { DocumentStore } from '../documentStore';
import { FileInfo } from './fileInfo';
import { nodeAtPosition } from '../common';

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

		const result: lsp.Location[] = [];
		let isScopedDefinition = false;

		// find references inside file
		const info = FileInfo.detailed(document, this._trees);
		const scope = info.root.findScope(params.position);
		const anchor = scope.findDefinitionOrUsage(params.position);
		if (anchor) {
			const definitions = scope.findDefinitions(anchor.name);
			const definitionKinds = new Set<lsp.SymbolKind>();
			for (let def of definitions) {
				if (params.context.includeDeclaration) {
					result.push(lsp.Location.create(document.uri, def.range));
				}
				definitionKinds.add(def.kind);
				if (def.scoped) {
					isScopedDefinition = true;
				}
			}
			const usages = scope.findUsages(anchor.name);
			for (let usage of usages) {
				if (definitionKinds.has(usage.kind)) {
					result.push(lsp.Location.create(document.uri, usage.range));
				}
			}
		}

		if (!isScopedDefinition) {
			// the definition the "anchor" was found or wasn't marked a local/argument and
			// therefore we try to find all symbols that match this name
			await this._fillInGlobalReferences(params, result);
		}

		return result;
	}

	private async _fillInGlobalReferences(params: lsp.ReferenceParams, bucket: lsp.Location[]) {

		const document = await this._documents.retrieve(params.textDocument.uri);
		const tree = this._trees.getParseTree(document);
		if (!tree) {
			return;
		}

		const text = nodeAtPosition(tree.rootNode, params.position).text;

		await this._symbols.update();

		const usages = this._symbols.usages.get(text);
		const definition = this._symbols.definitions.get(text);
		if (!usages && !definition) {
			return;
		}

		if (usages) {
			for (let usage of usages) {
				bucket.push(usage);
			}
		}

		if (definition) {
			for (let symbol of definition) {
				bucket.push(lsp.Location.create(symbol.location.uri, symbol.location.range));
			}
		}
	}
}
