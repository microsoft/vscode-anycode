/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Connection, Location, ReferenceParams } from 'vscode-languageserver';
import { containsLocation, nodeAtPosition } from '../common';
import { DocumentStore } from '../documentStore';
import { SymbolIndex } from '../symbolIndex';
import { Trees } from '../trees';

export class ReferencesProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
		private _symbols: SymbolIndex
	) { }

	register(connection: Connection) {
		connection.onReferences(this.provideReferences.bind(this));
	}

	async provideReferences(params: ReferenceParams): Promise<Location[]> {

		const tree = await this._trees.getParseTree(params.textDocument.uri);
		const node = nodeAtPosition(tree.rootNode, params.position);
		if (!node) {
			return [];
		}

		const text = node.text;
		await this._symbols.update();
		const usages = this._symbols.usages.get(text);
		const symbols = this._symbols.symbols.get(text);
		if (!usages && !symbols) {
			return [];
		}

		const locationsByKind = new Map<number, Location[]>();
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
}
