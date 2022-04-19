/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import type Parser from 'web-tree-sitter';

export type SymbolMapping = {
	getSymbolKind(symbolKind: string, strict: boolean): lsp.SymbolKind | undefined;
	getSymbolKind(symbolKind: string): lsp.SymbolKind;
};

export const symbolMapping: SymbolMapping = new class {

	private readonly _symbolKindMapping = new Map<string, lsp.SymbolKind>([
		['file', lsp.SymbolKind.File],
		['module', lsp.SymbolKind.Module],
		['namespace', lsp.SymbolKind.Namespace],
		['package', lsp.SymbolKind.Package],
		['class', lsp.SymbolKind.Class],
		['method', lsp.SymbolKind.Method],
		['property', lsp.SymbolKind.Property],
		['field', lsp.SymbolKind.Field],
		['constructor', lsp.SymbolKind.Constructor],
		['enum', lsp.SymbolKind.Enum],
		['interface', lsp.SymbolKind.Interface],
		['function', lsp.SymbolKind.Function],
		['variable', lsp.SymbolKind.Variable],
		['constant', lsp.SymbolKind.Constant],
		['string', lsp.SymbolKind.String],
		['number', lsp.SymbolKind.Number],
		['boolean', lsp.SymbolKind.Boolean],
		['array', lsp.SymbolKind.Array],
		['object', lsp.SymbolKind.Object],
		['key', lsp.SymbolKind.Key],
		['null', lsp.SymbolKind.Null],
		['enumMember', lsp.SymbolKind.EnumMember],
		['struct', lsp.SymbolKind.Struct],
		['event', lsp.SymbolKind.Event],
		['operator', lsp.SymbolKind.Operator],
		['typeParameter', lsp.SymbolKind.TypeParameter],
	]);

	getSymbolKind(symbolKind: string): lsp.SymbolKind;
	getSymbolKind(symbolKind: string, strict: true): lsp.SymbolKind | undefined;
	getSymbolKind(symbolKind: string, strict?: true): lsp.SymbolKind | undefined {

		const res = this._symbolKindMapping.get(symbolKind);
		if (!res && strict) {
			return undefined;
		}
		return res ?? lsp.SymbolKind.Variable;
	}
};

export interface Queries {
	readonly comments?: string;
	readonly folding?: string;
	readonly identifiers?: string;
	readonly locals?: string;
	readonly outline?: string;
	readonly references?: string;
}

export class LanguageInfo {
	constructor(
		readonly languageId: string,
		readonly wasmUri: string,
		readonly suffixes: string[],
		readonly queries?: Queries
	) { }
}

export interface FeatureConfig {
	completions?: boolean;
	definitions?: boolean;
	references?: boolean;
	highlights?: boolean;
	outline?: boolean;
	folding?: boolean;
	workspaceSymbols?: boolean;
	diagnostics?: boolean;
};

export type LanguageConfiguration = [LanguageInfo, FeatureConfig][];

// --- geometry

export function asLspRange(node: Parser.SyntaxNode): lsp.Range {
	return lsp.Range.create(node.startPosition.row, node.startPosition.column, node.endPosition.row, node.endPosition.column);
}

export function identifierAtPosition(identQuery: Parser.Query, node: Parser.SyntaxNode, position: lsp.Position): Parser.SyntaxNode | undefined {

	// `foo|::bar` -> finds `::`
	let candidate = nodeAtPosition(node, position, false);
	let capture = identQuery.captures(candidate);
	if (capture.length === 1) {
		return candidate;
	}

	// `foo|::bar` -> finds `foo`
	candidate = nodeAtPosition(node, position, true);
	capture = identQuery.captures(candidate);
	if (capture.length === 1) {
		return candidate;
	}
	return undefined;
}

export function nodeAtPosition(node: Parser.SyntaxNode, position: lsp.Position, leftBias: boolean = false): Parser.SyntaxNode {
	for (const child of node.children) {
		const range = asLspRange(child);
		if (isBeforeOrEqual(range.start, position)) {
			if (isBefore(position, range.end)) {
				return nodeAtPosition(child, position, leftBias);
			}
			if (leftBias && isBeforeOrEqual(position, range.end)) {
				return nodeAtPosition(child, position, leftBias);
			}
		}
	}
	return node;
}

export function isBeforeOrEqual(a: lsp.Position, b: lsp.Position): boolean {
	if (a.line < b.line) {
		return true;
	}
	if (b.line < a.line) {
		return false;
	}
	return a.character <= b.character;
}

export function isBefore(a: lsp.Position, b: lsp.Position): boolean {
	if (a.line < b.line) {
		return true;
	}
	if (b.line < a.line) {
		return false;
	}
	return a.character < b.character;
}

export function compareRangeByStart(a: lsp.Range, b: lsp.Range): number {
	if (isBefore(a.start, b.start)) {
		return -1;
	} else if (isBefore(b.start, a.start)) {
		return 1;
	}
	// same start...
	if (isBefore(a.end, b.end)) {
		return -1;
	} else if (isBefore(b.end, a.end)) {
		return 1;
	}
	return 0;
}

export function containsPosition(range: lsp.Range, position: lsp.Position): boolean {
	return isBeforeOrEqual(range.start, position) && isBeforeOrEqual(position, range.end);
}

export function containsPositionStrict(range: lsp.Range, position: lsp.Position): boolean {
	return isBefore(range.start, position) && isBefore(position, range.end);
}

export function containsRange(range: lsp.Range, other: lsp.Range): boolean {
	return containsPosition(range, other.start) && containsPosition(range, other.end);
}

export function containsLocation(loc: lsp.Location, uri: string, position: lsp.Position) {
	return loc.uri === uri && containsPosition(loc.range, position);
}

export class StopWatch {
	private t1: number = performance.now();

	reset() {
		this.t1 = performance.now();
	}
	elapsed() {
		return (performance.now() - this.t1).toFixed(2);
	}
}

// TODO@jrieken this list isn't sustainable...
export function isInteresting(uri: string): boolean {
	return !/^(git|github|vsls|review):/i.test(uri);
}

export async function parallel<R>(tasks: ((token: lsp.CancellationToken) => Promise<R>)[], degree: number, token: lsp.CancellationToken): Promise<R[]> {
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
