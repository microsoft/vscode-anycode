/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Parser } from '../../tree-sitter/tree-sitter';
import * as vscode from 'vscode';
import { ITrees, asCodeRange, StopWatch, isInteresting, matchesFuzzy, IDocument } from '../common';

const _symbolQueries = new class {

	private readonly _data = new Map<string, Promise<{ symbols: string }> | Parser.Query>([
		['typescript', import('./queries-typescript')],
		['php', import('./queries-php')],
		['python', import('./queries-python')],
		['java', import('./queries-java')],
		['c', import('./queries-c')],
		['cpp', import('./queries-cpp')],
		['csharp', import('./queries-c_sharp')],
		['go', import('./queries-go')],
		['rust', import('./queries-rust')],
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
				query = language.query((await query).symbols);
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

		sw.reset();
		const captures = query.captures(tree.rootNode);
		sw.elapsed('CAPTURE query');


		class Node {
			readonly range: vscode.Range;
			readonly children: Node[] = [];
			constructor(readonly capture: Parser.QueryCapture) {
				this.range = asCodeRange(capture.node);
			}
		}
		// build a Node-tree that is based on range containment. This includes true 
		// children as well as the "name-child"
		sw.reset();
		const roots: Node[] = [];
		const stack: Node[] = [];
		for (const capture of captures) {
			const node = new Node(capture);
			let parent = stack.pop();
			while (true) {
				if (!parent) {
					roots.push(node);
					stack.push(node);
					break;
				}
				if (parent.range.contains(node.range)) {
					parent.children.push(node);
					stack.push(parent);
					stack.push(node);
					break;
				}
				parent = stack.pop();
			}
		}
		sw.elapsed('make TREE');

		// build DocumentSymbol-tree from Node-tree. Children of nodes that match
		// the `<xyz>.name` capture name are used as identifier/name and aren't producing
		// a dedicated document symbol
		function build(node: Node, bucket: vscode.DocumentSymbol[]): void {
			let children: vscode.DocumentSymbol[] = [];
			let nameNode: Node | undefined;
			for (let child of node.children) {
				if (!nameNode && child.capture.name === `${node.capture.name}.name`) {
					nameNode = child;
				} else {
					build(child, children);
				}
			}
			if (!nameNode) {
				nameNode = node;
			}
			const symbol = new vscode.DocumentSymbol(nameNode.capture.node.text, '', _symbolQueries.getSymbolKind(node.capture.name), node.range, nameNode.range);
			symbol.children = children;

			bucket.push(symbol);
		}

		sw.reset();
		const result: vscode.DocumentSymbol[] = [];
		for (let node of roots) {
			build(node, result);
		}
		sw.elapsed('make SYMBOLS');

		return result;
	}
}

export class WorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {

	constructor(private _trees: ITrees) { }

	register(): vscode.Disposable {
		return vscode.languages.registerWorkspaceSymbolProvider(this);
	}

	async provideWorkspaceSymbols(search: string, token: vscode.CancellationToken) {

		type Config = 'off' | 'workspace' | 'documents';
		const value = vscode.workspace.getConfiguration('anycode').get<Config>('workspaceSymbols');

		if (value === 'off') {
			return;
		}

		const sw = new StopWatch();
		const result: vscode.SymbolInformation[] = [];

		// when enabled always search inside open text documents
		for (const document of vscode.workspace.textDocuments) {
			await this._collectMatches(search, document, token, result);
			if (token.isCancellationRequested) {
				return undefined;
			}
		}

		// optionally search everywhere
		if (value === 'workspace') {
			const uris = await this._findCandidateDocuments(search, token);
			for (const uri of uris) {
				if (token.isCancellationRequested) {
					return undefined;
				}
				if (vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString())) {
					// we have seen this already
					continue;
				}
				// search
				const data = await vscode.workspace.fs.readFile(uri);
				const source = new TextDecoder().decode(data);

				// find language...
				let languageId = '';
				for (let [key, value] of WorkspaceSymbolProvider._languageMapping) {
					if (value.some(suffix => uri.path.endsWith(`.${suffix}`))) {
						languageId = key;
						break;
					}
				}

				this._collectMatches(search, {
					version: 1,
					uri,
					languageId,
					getText() { return source; },
				}, token, result);
			}
		}

		sw.elapsed('WORKSPACE symbols');
		return result;
	}

	private async _collectMatches(search: string, document: IDocument, token: vscode.CancellationToken, bucket: vscode.SymbolInformation[]) {
		if (!isInteresting(document) || !_symbolQueries.isSupported(document.languageId)) {
			return;
		}
		const tree = await this._trees.getParseTree(document, token);
		if (!tree) {
			return;
		}
		const query = await _symbolQueries.get(document.languageId, tree.getLanguage());
		if (!query) {
			return;
		}
		query.captures(tree.rootNode).forEach((capture, index, array) => {
			if (!capture.name.endsWith('.name')) {
				return;
			}
			if (search.length === 0 || matchesFuzzy(search, capture.node.text)) {
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
				bucket.push(symbol);
			}
		});
	}

	private async _findCandidateDocuments(query: string, token: vscode.CancellationToken) {

		if (!/\w{1,}/.test(query)) {
			return [];
		}

		// make regex from query character
		const fuzzyCharacters = query.split('').map(ch => `${ch}\\w*`);
		const pattern = `(^|[\\s_-])${fuzzyCharacters.join('')}`;

		const cts = new vscode.CancellationTokenSource();
		token.onCancellationRequested(() => cts.cancel());

		// run search
		const results = new Map<string, vscode.Uri>();
		await vscode.workspace.findTextInFiles({
			pattern,
			isRegExp: true,
			isCaseSensitive: false,
			isMultiline: false,
			isWordMatch: false
		}, {
			previewOptions: { matchLines: 1, charsPerLine: 1 },
			include: `**/*.{${Array.from(WorkspaceSymbolProvider._languageMapping.values()).flat().join(',')}}`,
			useDefaultExcludes: true,
			useGlobalIgnoreFiles: true,
			useIgnoreFiles: true,
		}, result => {
			results.set(result.uri.toString(), result.uri);
			if (results.size >= 500) {
				console.warn('stopping _findCandidateDocuments because having 500 result');
				cts.cancel();
			}
		}, cts.token);

		cts.dispose();
		return results.values();
	}

	// we should have API for this...
	private static _languageMapping = new Map<string, string[]>([
		['typescript', ['ts', 'tsx']],
		['php', ['php', 'php4', 'php5', 'phtml', 'ctp']],
		['python', ['py', 'rpy', 'pyw', 'cpy', 'gyp', 'gypi', 'pyi', 'ipy',]],
		['go', ['go']],
		['java', ['java']],
		['c', ['c', 'i']],
		['cpp', ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hh', 'hxx', 'h++', 'h', 'ii', 'ino', 'inl', 'ipp', 'ixx', 'hpp.in', 'h.in']],
		['csharp', ['cs']],
		['rust', ['rs']],
	]);
}
