/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection, BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver/browser';
import { InitializeParams, InitializeResult, ServerCapabilities, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import Parser from '../../tree-sitter/tree-sitter';
import { Trees } from './trees';
import { DocumentSymbols } from './features/documentSymbols';
import { SymbolIndex } from './symbolIndex';
import { FileQueueAndDocuments } from './fileQueue';
import { SelectionRangesProvider } from './features/selectionRanges';
import { CompletionItemProvider } from './features/completions';
import { WorkspaceSymbol } from './features/workspaceSymbols';
import { DefinitionProvider } from './features/definitions';
import { ReferencesProvider } from './features/references';
import { Validation } from './features/validation';

type InitOptions = {
	treeSitterWasmUri: string;
	supportedLanguages: { languageId: string, wasmUri: string, suffixes: string[] }[]
};

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);
const documents = new TextDocuments(TextDocument);

connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {

	// (1) init tree sitter before doing anything else
	await Parser.init({
		locateFile() {
			return (<InitOptions>params.initializationOptions).treeSitterWasmUri;
		}
	});

	// (2) setup features
	const trees = new Trees(documents, (<InitOptions>params.initializationOptions).supportedLanguages);
	const fileQueue = new FileQueueAndDocuments(connection, documents);
	const symbols = new SymbolIndex(trees, fileQueue);

	// --- init of index
	connection.onRequest('file/queue/init', uris => {
		uris.forEach(fileQueue.enqueue, fileQueue);
		return symbols.update();
	});


	new WorkspaceSymbol(symbols).register(connection);
	new DocumentSymbols(symbols).register(connection);
	new DefinitionProvider(documents, trees, symbols).register(connection);
	new ReferencesProvider(documents, trees, symbols).register(connection);
	new CompletionItemProvider(symbols).register(connection);
	new SelectionRangesProvider(documents, trees).register(connection);
	new Validation(connection, documents, trees);

	const capabilities: ServerCapabilities = {
		workspaceSymbolProvider: true,
		documentSymbolProvider: true,
		definitionProvider: true,
		referencesProvider: true,
		completionProvider: {},
		selectionRangeProvider: true,
	};
	return { capabilities };
});


documents.listen(connection);
connection.listen();
