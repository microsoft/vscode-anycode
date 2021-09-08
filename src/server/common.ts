/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, Range, Position, Location } from 'vscode-languageserver';
import type Parser from '../../tree-sitter/tree-sitter';

export function asCodeRange(node: Parser.SyntaxNode): Range {
	return Range.create(node.startPosition.row, node.startPosition.column, node.endPosition.row, node.endPosition.column);
}

export function nodeAtPosition(node: Parser.SyntaxNode, position: Position): Parser.SyntaxNode | undefined {
	for (let child of node.children) {
		if (containsPosition(asCodeRange(child), position)) {
			return nodeAtPosition(child, position) ?? child;
		}
	}
	return undefined;
}

export function asTsPoint(position: Position): Parser.Point {
	return {
		row: position.line,
		column: position.character
	};
}

export function isBeforeOrEqual(a: Position, b: Position): boolean {
	if (a.line < b.line) {
		return true;
	}
	if (b.line < a.line) {
		return false;
	}
	return a.character <= b.character;
}

export function containsPosition(range: Range, position: Position): boolean {
	return isBeforeOrEqual(range.start, position) && isBeforeOrEqual(position, range.end);
}

export function containsRange(range: Range, other: Range): boolean {
	return containsPosition(range, other.start) && containsPosition(range, other.end);
}

export function containsLocation(loc: Location, uri: string, position: Position) {
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

export async function parallel<R>(tasks: ((token: CancellationToken) => Promise<R>)[], degree: number, token: CancellationToken): Promise<R[]> {
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
