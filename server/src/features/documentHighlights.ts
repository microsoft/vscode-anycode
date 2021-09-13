/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import { Trees } from '../trees';
import { DocumentStore } from '../documentStore';
import { FileInfo } from './fileInfo';

export class DocumentHighlightsProvider {

	constructor(
		private readonly _documents: DocumentStore,
		private readonly _trees: Trees,
	) { }

	register(connection: lsp.Connection) {
		connection.onDocumentHighlight(this.provideDocumentHighlights.bind(this));
	}

	async provideDocumentHighlights(params: lsp.DocumentHighlightParams): Promise<lsp.DocumentHighlight[]> {
		const document = await this._documents.retrieve(params.textDocument.uri);

		const info = FileInfo.detailed(document, this._trees);
		const scope = info.root.findScope(params.position);

		const anchor = scope.findDefinitionOrUsage(params.position);
		if (!anchor) {
			return [];
		}
		const result: lsp.DocumentHighlight[] = [];
		const usages = scope.findUsages(anchor.name);
		for (let usage of usages) {
			result.push(lsp.DocumentHighlight.create(usage.range, lsp.DocumentHighlightKind.Read));
		}
		const definitions = scope.findDefinitions(anchor.name);
		for (let def of definitions) {
			result.push(lsp.DocumentHighlight.create(def.range, lsp.DocumentHighlightKind.Write));

		}
		return result;
	}
}
