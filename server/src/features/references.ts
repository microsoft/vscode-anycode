/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { asLspRange, containsLocation, nodeAtPosition } from '../common';
import { SymbolIndex } from './symbolIndex';
import { Trees } from '../trees';
import { DocumentStore } from '../documentStore';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { FileInfo } from './fileInfo';
import { SyntaxNode } from '../../tree-sitter/tree-sitter';

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
		if (this._findReferencesInFile(document, params.position, params.context.includeDeclaration, result)) {
			return result;
		}

		const tree = this._trees.getParseTree(document);
		if (!tree) {
			return result;
		}
		const node = nodeAtPosition(tree.rootNode, params.position);
		if (!node) {
			return result;
		}

		const text = node.text;
		await this._symbols.update();
		const usages = this._symbols.usages.get(text);
		const symbols = this._symbols.symbols.get(text);
		if (!usages && !symbols) {
			return result;
		}

		const locationsByKind = new Map<number, lsp.Location[]>();
		let thisKind: number | undefined;
		if (usages) {
			for (let usage of usages) {
				if (thisKind === undefined) {
					if (containsLocation(usage.location, params.textDocument.uri, params.position)) {
						thisKind = usage.kind;
					}
				}
				const array = locationsByKind.get(usage.kind ?? -1);
				if (!array) {
					locationsByKind.set(usage.kind ?? -1, [usage.location]);
				} else {
					array.push(usage.location);
				}
			}
		}

		if (symbols) {
			for (let symbol of symbols) {
				if (thisKind === undefined) {
					if (containsLocation(symbol.location, params.textDocument.uri, params.position)) {
						thisKind = symbol.kind;
					}
				}
				if (params.context.includeDeclaration) {
					const array = locationsByKind.get(symbol.kind);
					if (!array) {
						locationsByKind.set(symbol.kind, [symbol.location]);
					} else {
						array.push(symbol.location);
					}
				}
			}
		}

		if (thisKind === undefined) {
			return Array.from(locationsByKind.values()).flat();

		} else {
			const sameKind = locationsByKind.get(thisKind) ?? [];
			const unknownKind = locationsByKind.get(-1) ?? [];
			return [sameKind, unknownKind].flat();
		}
	}

	private _findReferencesInFile(document: TextDocument, position: lsp.Position, includeDefinition: boolean, result: lsp.Location[]) {
		const info = FileInfo.create(document, this._trees);
		const scope = info.root.findScope(position);
		const anchor = scope.findUsage(position) ?? scope.findDefinition(position);
		if (!anchor) {
			return false;
		}

		const all: SyntaxNode[][] = [];
		all.push(scope.findUsages(anchor.text));
		if (includeDefinition) {
			all.push(scope.findDefinitions(anchor.text));
		}

		for (let def of all.flat()) {
			result.push(lsp.Location.create(document.uri, asLspRange(def)));
		}
		return true;
	}
}
