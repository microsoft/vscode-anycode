/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Parser } from '../../tree-sitter/tree-sitter';
import * as vscode from 'vscode';
import { ITrees, asCodeRange, StopWatch } from '../common';

export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {

    private static readonly _queries = new Map<string, Promise<{ default: string }> | Parser.Query>([
        ['typescript', import('./queries-typescript')],
        ['python', import('./queries-python')],
        ['java', import('./queries-java')],
        ['c', import('./queries-c')],
        ['cpp', import('./queries-cpp')],
        ['csharp', import('./queries-c_sharp')],
    ]);

    private static readonly _symbolKindMapping = new Map<string, vscode.SymbolKind>([
        ['class', vscode.SymbolKind.Class],
        ['interface', vscode.SymbolKind.Interface],
        ['enum', vscode.SymbolKind.Enum],
        ['enumMember', vscode.SymbolKind.EnumMember],
        ['field', vscode.SymbolKind.Field],
        ['method', vscode.SymbolKind.Method],
        ['function', vscode.SymbolKind.Function],
        ['variable', vscode.SymbolKind.Variable],
        ['property', vscode.SymbolKind.Property],
        ['struct', vscode.SymbolKind.Struct],
        ['module', vscode.SymbolKind.Module],
    ]);

    constructor(private _trees: ITrees) { }

    register(): vscode.Disposable {
        // vscode.languages.registerDocumentSymbolProvider([...this._trees.supportedLanguages], new TreeOutline(this._trees));
        return vscode.languages.registerDocumentSymbolProvider([...DocumentSymbolProvider._queries.keys()], this);
    }

    async provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken) {

        const tree = await this._trees.getParseTree(document, token);
        if (!tree) {
            return undefined;
        }

        let query = DocumentSymbolProvider._queries.get(document.languageId);
        if (query instanceof Promise) {
            try {
                query = (<Parser.Language>tree.getLanguage()).query((await query).default);
                DocumentSymbolProvider._queries.set(document.languageId, query);
            } catch (e) {
                console.log(document.languageId, e);
                DocumentSymbolProvider._queries.delete(document.languageId);
                query = undefined;
            }
        }

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
            if (captures[i + 1]?.name === capture.name + '_name') {
                nameCapture = captures[i + 1];
                i++;
            }
            symbolsFlat.push(new vscode.DocumentSymbol(nameCapture.node.text, '',
                DocumentSymbolProvider._symbolKindMapping.get(capture.name) ?? vscode.SymbolKind.Struct,
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
};

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
