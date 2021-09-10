/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as lsp from 'vscode-languageserver';
import type Parser from '../tree-sitter/tree-sitter';


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

		if (symbolKind.startsWith('symbol.')) {
			symbolKind = symbolKind.substring(7);
		}

		const res = this._symbolKindMapping.get(symbolKind);
		if (!res && strict) {
			return undefined;
		}
		return res ?? lsp.SymbolKind.Variable;
	}
};



// --- geometry

export function asLspRange(node: Parser.SyntaxNode): lsp.Range {
	return lsp.Range.create(node.startPosition.row, node.startPosition.column, node.endPosition.row, node.endPosition.column);
}

export function nodeAtPosition(node: Parser.SyntaxNode, position: lsp.Position): Parser.SyntaxNode | undefined {
	for (let child of node.children) {
		if (containsPosition(asLspRange(child), position)) {
			return nodeAtPosition(child, position) ?? child;
		}
	}
	return undefined;
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

export function containsPosition(range: lsp.Range, position: lsp.Position): boolean {
	return isBeforeOrEqual(range.start, position) && isBeforeOrEqual(position, range.end);
}

export function containsRange(range: lsp.Range, other: lsp.Range): boolean {
	return containsPosition(range, other.start) && containsPosition(range, other.end);
}

export function containsLocation(loc: lsp.Location, uri: string, position: lsp.Position) {
	return loc.uri === uri && containsPosition(loc.range, position);
}

export class StopWatch {
	private t1: number = Date.now();

	reset() {
		this.t1 = Date.now();
	}
	elapsed(msg: string) {
		const du = Date.now() - this.t1;
		console.debug(`${msg}, ${du}ms`);
	}
}

export function isInteresting(uri: string): boolean {
	return !/^(git|github|vsls):/i.test(uri);
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
