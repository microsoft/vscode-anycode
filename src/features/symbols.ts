/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Parser } from '../../tree-sitter/tree-sitter';
import * as vscode from 'vscode';
import { ITrees, asCodeRange, StopWatch } from '../common';


const _symbolQueries = new class {

	private readonly _data = new Map<string, Promise<{ default: string }> | Parser.Query>([
		['typescript', import('./queries-typescript')],
		['php', import('./queries-php')],
		['python', import('./queries-python')],
		['java', import('./queries-java')],
		['c', import('./queries-c')],
		['cpp', import('./queries-cpp')],
		['csharp', import('./queries-c_sharp')],
	]);

	private readonly _symbolKindMapping = new Map<string, vscode.SymbolKind>([
		['file', vscode.SymbolKind.File],
		['module', vscode.SymbolKind.Module],
		['namespace', vscode.SymbolKind.Namespace],
		['package', vscode.SymbolKind.Package],
		['class', vscode.SymbolKind.Class],
		['method', vscode.SymbolKind.Method],
		['property', vscode.SymbolKind.Property],
		['field', vscode.SymbolKind.Field],
		['constructor', vscode.SymbolKind.Constructor],
		['enum', vscode.SymbolKind.Enum],
		['interface', vscode.SymbolKind.Interface],
		['function', vscode.SymbolKind.Function],
		['variable', vscode.SymbolKind.Variable],
		['constant', vscode.SymbolKind.Constant],
		['string', vscode.SymbolKind.String],
		['number', vscode.SymbolKind.Number],
		['boolean', vscode.SymbolKind.Boolean],
		['array', vscode.SymbolKind.Array],
		['object', vscode.SymbolKind.Object],
		['key', vscode.SymbolKind.Key],
		['null', vscode.SymbolKind.Null],
		['enumMember', vscode.SymbolKind.EnumMember],
		['struct', vscode.SymbolKind.Struct],
		['event', vscode.SymbolKind.Event],
		['operator', vscode.SymbolKind.Operator],
		['typeParameter', vscode.SymbolKind.TypeParameter],
	]);

	isSupported(languageId: string): boolean {
		return this._data.has(languageId);
	}

	get languageIds(): string[] {
		return Array.from(this._data.keys());
	}

	async get(languageId: string, language: Parser.Language): Promise<Parser.Query | undefined> {
		let query = this._data.get(languageId);
		if (query instanceof Promise) {
			try {
				query = language.query((await query).default);
				this._data.set(languageId, query);
			} catch (e) {
				console.log(languageId, e);
				this._data.delete(languageId);
				query = undefined;
			}
		}
		return query;
	}

	getSymbolKind(symbolKind: string): vscode.SymbolKind {
		return this._symbolKindMapping.get(symbolKind) ?? vscode.SymbolKind.Variable;
	}
};

export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {

	constructor(private _trees: ITrees) { }

	register(): vscode.Disposable {
		// vscode.languages.registerDocumentSymbolProvider([...this._trees.supportedLanguages], new TreeOutline(this._trees));
		return vscode.languages.registerDocumentSymbolProvider(_symbolQueries.languageIds, this);
	}

	async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken) {

		const tree = await this._trees.getParseTree(document, token);
		if (!tree) {
			return undefined;
		}

		const query = await _symbolQueries.get(document.languageId, tree.getLanguage());

		if (!query) {
			return undefined;
		}

		const sw = new StopWatch();

		sw.start();
		const captures = query.captures(tree.rootNode);
		sw.elapsed('CAPTURE query');

		// make flat symbols from all captures
		sw.start();
		const symbolsFlat: vscode.DocumentSymbol[] = [];
		for (let i = 0; i < captures.length; i++) {
			const capture = captures[i];
			let nameCapture = capture;
			if (captures[i + 1]?.name === `${capture.name}.name`) {
				nameCapture = captures[i + 1];
				i++;
			}
			symbolsFlat.push(new vscode.DocumentSymbol(nameCapture.node.text, '',
				_symbolQueries.getSymbolKind(capture.name),
				asCodeRange(capture.node), asCodeRange(nameCapture.node)
			));
		}
		sw.elapsed('MAKE document symbols');

		// make tree from flat symbols
		sw.start();
		let symbolsTree: vscode.DocumentSymbol[] = [];
		let stack: vscode.DocumentSymbol[] = [];
		for (let symbol of symbolsFlat) {
			let parent = stack.pop();
			while (true) {
				if (!parent) {
					stack.push(symbol);
					symbolsTree.push(symbol);
					break;
				}
				if (parent.range.contains(symbol.range)) {
					parent.children.push(symbol);
					stack.push(parent);
					stack.push(symbol);
					break;
				}
				parent = stack.pop();
			}
		}
		sw.elapsed('make symbol TREE');
		return symbolsTree;
	}
}

class TreeOutline implements vscode.DocumentSymbolProvider {

	constructor(private _trees: ITrees) { }

	async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken) {
		const tree = await this._trees.getParseTree(document, token);
		if (!tree) {
			return undefined;
		}

		const result: vscode.DocumentSymbol[] = [];
		function buildTree(node: Parser.SyntaxNode, bucket: vscode.DocumentSymbol[]) {
			if (node.isNamed()) {
				const symbol = new vscode.DocumentSymbol(node.type, node.text, vscode.SymbolKind.Struct, asCodeRange(node), asCodeRange(node));
				bucket.push(symbol);
				bucket = symbol.children;
			}
			for (let child of node.children) {
				buildTree(child, bucket);
			}
		}
		buildTree(tree.rootNode, result);
		return result;
	}
}


export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {

	constructor(private _trees: ITrees) { }

	register(): vscode.Disposable {
		return vscode.languages.registerWorkspaceSymbolProvider(this);
	}

	async provideWorkspaceSymbols(search: string, token: vscode.CancellationToken) {
		const sw = new StopWatch();
		const result: vscode.SymbolInformation[] = [];

		for (const document of vscode.workspace.textDocuments) {
			if (token.isCancellationRequested) {
				break;
			}
			if (!_symbolQueries.isSupported(document.languageId)) {
				continue;
			}
			const tree = await this._trees.getParseTree(document, token);
			if (!tree) {
				continue;
			}
			const query = await _symbolQueries.get(document.languageId, tree.getLanguage());
			if (!query) {
				continue;
			}
			query.captures(tree.rootNode).forEach((capture, index, array) => {
				if (!capture.name.endsWith('.name')) {
					return;
				}
				if (search.length === 0 || WorkspaceSymbolProvider._matchesFuzzy(search, capture.node.text)) {
					const symbol = new vscode.SymbolInformation(
						capture.node.text,
						vscode.SymbolKind.Struct,
						'',
						new vscode.Location(document.uri, asCodeRange(capture.node))
					);
					const containerCandidate = array[index - 1];
					if (capture.name.startsWith(containerCandidate.name)) {
						symbol.containerName = containerCandidate.name;
						symbol.kind = _symbolQueries.getSymbolKind(containerCandidate.name);
					}
					result.push(symbol);
				}
			});
		}
		sw.elapsed('WORKSPACE symbols');
		return result;
	}

	private static _matchesFuzzy(query: string, candidate: string) {
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
}
