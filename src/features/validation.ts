/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ITrees, asCodeRange, StopWatch, isInteresting } from '../common';

export class Validation {

	private readonly _disposables: vscode.Disposable[] = [];
	private readonly _currentValidation = new Map<vscode.TextDocument, vscode.CancellationTokenSource>();
	private readonly _collection: vscode.DiagnosticCollection;

	constructor(private readonly _trees: ITrees) {
		this._collection = vscode.languages.createDiagnosticCollection();

		vscode.workspace.textDocuments.forEach(this._triggerValidation, this);
		this._disposables.push(vscode.workspace.onDidChangeTextDocument(e => this._triggerValidation(e.document)));
		this._disposables.push(vscode.workspace.onDidOpenTextDocument(this._triggerValidation, this));
		this._disposables.push(vscode.workspace.onDidCloseTextDocument(e => this._collection.delete(e.uri)));
	}

	dispose(): void {
		this._disposables.forEach(d => d.dispose());
		this._collection.dispose();
	}

	private async _triggerValidation(document: vscode.TextDocument): Promise<void> {
		if (!vscode.languages.match(this._trees.supportedLanguages, document) || !isInteresting(document)) {
			// unsupported
			return;
		}

		const enabled = vscode.workspace.getConfiguration('anycode', document).get('diagnostics', false);
		if (!enabled) {
			// disabled for this language
			return;
		}

		// cancel pending validation
		let cts = this._currentValidation.get(document);
		cts?.cancel();
		cts?.dispose();

		// schedule new validation
		cts = new vscode.CancellationTokenSource();
		this._currentValidation.set(document, cts);
		const handle = setTimeout(() => this._createDiagnostics(document, cts!.token), 500);
		cts.token.onCancellationRequested(() => clearTimeout(handle));
	}

	private async _createDiagnostics(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<void> {
		const tree = await this._trees.getParseTree(document, token);
		const diags: vscode.Diagnostic[] = [];
		if (tree) {
			const sw = new StopWatch();
			// find MISSING nodes (those that got auto-inserted)
			const cursor = tree.walk();
			const seen = new Set<number>();
			try {
				let visitedChildren = false;
				while (true) {
					if (cursor.nodeIsMissing && !seen.has(cursor.nodeId)) {
						diags.push({
							range: asCodeRange(cursor.currentNode()),
							message: `Expected '${cursor.nodeType}'`,
							severity: vscode.DiagnosticSeverity.Error,
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
		this._collection.set(document.uri, diags);
	}
}
