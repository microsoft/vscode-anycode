/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Parser } from '../tree-sitter/tree-sitter';
import * as vscode from 'vscode';

export interface IDocument {
	uri: vscode.Uri,
	version: number;
	languageId: string;
	getText(): string;
}

export interface ITrees {
	supportedLanguages: readonly string[];
	getParseTree(document: IDocument, token: vscode.CancellationToken): Promise<Parser.Tree | undefined>;
	getLanguage(langId: string): Promise<Parser.Language | undefined>
}

export function asCodeRange(node: Parser.SyntaxNode): vscode.Range {
	return new vscode.Range(node.startPosition.row, node.startPosition.column, node.endPosition.row, node.endPosition.column);
}

export function asTsPoint(position: vscode.Position): Parser.Point {
	return {
		row: position.line,
		column: position.character
	};
}

export class StopWatch {
	private t1: number = Date.now();

	reset() {
		this.t1 = Date.now();
	}
	elapsed(msg: string) {
		const du = Date.now() - this.t1;
		console.info(`${msg}, ${du}ms`);
	}
}

const _disabledSchemes = new Set(['git', 'vsls']);

export function isInteresting(document: IDocument): boolean {
	return !_disabledSchemes.has(document.uri.scheme);
}


export function matchesFuzzy(query: string, candidate: string): boolean {
	if (query.length > candidate.length) {
		return false;
	}
	query = query.toLowerCase();
	candidate = candidate.toLowerCase();
	let queryPos = 0;
	let candidatePos = 0;
	while (queryPos < query.length && candidatePos < candidate.length) {
		if (query.charAt(queryPos) === candidate.charAt(candidatePos)) {
			queryPos++;
		}
		candidatePos++;
	}
	return queryPos === query.length;
}
