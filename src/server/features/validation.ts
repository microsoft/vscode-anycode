/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationTokenSource, Connection, Diagnostic, DiagnosticSeverity, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { asCodeRange, StopWatch, isInteresting } from '../common';
import { Trees } from '../trees';

export class Validation {

	private readonly _currentValidation = new Map<TextDocument, CancellationTokenSource>();

	constructor(
		private readonly _connection: Connection,
		private readonly _documents: TextDocuments<TextDocument>,
		private readonly _trees: Trees
	) {
		// this._collection = vscode.languages.createDiagnosticCollection();
		_documents.all().forEach(this._triggerValidation, this);
		_documents.onDidChangeContent(e => this._triggerValidation(e.document));
		_documents.onDidOpen(e => this._triggerValidation(e.document));

		_documents.onDidClose(e => {
			_connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
		});
	}

	private async _triggerValidation(document: TextDocument): Promise<void> {
		if (!isInteresting(document.uri)) {
			// unsupported
			return;
		}

		// todo@jrieken
		// const enabled = vscode.workspace.getConfiguration('anycode', document).get('diagnostics', false);
		// if (!enabled) {
		// 	// disabled for this language
		// 	return;
		// }

		// cancel pending validation
		let cts = this._currentValidation.get(document);
		cts?.cancel();
		cts?.dispose();

		// schedule new validation
		cts = new CancellationTokenSource();
		this._currentValidation.set(document, cts);
		const handle = setTimeout(() => this._createDiagnostics(document), 500);
		cts.token.onCancellationRequested(() => clearTimeout(handle));
	}

	private async _createDiagnostics(document: TextDocument): Promise<void> {
		const tree = await this._trees.getParseTree(document);
		const diagnostics: Diagnostic[] = [];
		if (tree) {
			const sw = new StopWatch();
			// find MISSING nodes (those that got auto-inserted)
			const cursor = tree.walk();
			const seen = new Set<number>();
			try {
				let visitedChildren = false;
				while (true) {
					if (cursor.nodeIsMissing && !seen.has(cursor.nodeId)) {
						diagnostics.push({
							range: asCodeRange(cursor.currentNode()),
							message: `Expected '${cursor.nodeType}'`,
							severity: DiagnosticSeverity.Error,
							source: 'anycode',
							code: 'missing',
						});
						seen.add(cursor.nodeId);
					}

					// depth first search
					if (!visitedChildren) {
						if (!cursor.gotoFirstChild()) {
							visitedChildren = true;
						}
					}
					if (visitedChildren) {
						if (cursor.gotoNextSibling()) {
							visitedChildren = false;
						} else if (cursor.gotoParent()) {
							visitedChildren = true;
						} else {
							break;
						}
					}
				}
			} finally {
				cursor.delete();
			}

			// // find "generic" error nodes
			// let query: Parser.Query | undefined;
			// try {
			// 	query = tree.getLanguage().query('(ERROR) @error');
			// 	const captures = query.captures(tree.rootNode);
			// 	for (let capture of captures) {
			// 		diags.push({
			// 			range: asCodeRange(capture.node),
			// 			message: 'Error',
			// 			severity: vscode.DiagnosticSeverity.Error,
			// 			source: 'anycode',
			// 			code: 'error',
			// 		});
			// 	}
			// } catch {
			// 	// ignore - parsing the query might fail
			// } finally {
			// 	query?.delete();
			// }
			sw.elapsed('DIAGNOSTICS');
		}

		this._connection.sendDiagnostics({ uri: document.uri, diagnostics });
	}
}
