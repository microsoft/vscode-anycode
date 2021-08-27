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

const _disabledSchemes = new Set(['git', 'github', 'vsls']);

export function isInteresting(uri: vscode.Uri): boolean {
	return !_disabledSchemes.has(uri.scheme);
}

export async function parallel<R>(tasks: ((token: vscode.CancellationToken) => Promise<R>)[], degree: number, token: vscode.CancellationToken): Promise<R[]> {
	let result: R[] = [];
	let pos = 0;
	while (true) {
		if (token.isCancellationRequested) {
			throw new Error('cancelled');
		}
		const partTasks = tasks.slice(pos, pos + degree);
		if (partTasks.length === 0) {
			break;
		}
		const partResult = await Promise.all(partTasks.map(task => task(token)));
		pos += degree;
		result.push(...partResult);
	}
	return result;
}

// --- ghetto LRU that utilizes the fact that Map keeps things in insertion order

export class LRUMap<K, V> extends Map<K, V> {

	private readonly _cacheLimits = { max: 45, size: 30 };

	constructor(size: number = 30) {
		super();
		this._cacheLimits = { size, max: Math.round(size * 1.3) };
	}

	get(key: K): V | undefined {
		if (!this.has(key)) {
			return undefined;
		}
		const result = super.get(key);
		this.delete(key);
		this.set(key, result!);
		return result;
	}

	cleanup(): [K, V][] {
		if (this.size < this._cacheLimits.max) {
			return [];
		}
		const result = Array.from(this.entries()).slice(0, this._cacheLimits.size);
		for (let [key] of result) {
			this.delete(key);
		}
		return result;
	}
}
