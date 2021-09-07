/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection, BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver/browser';
import { InitializeParams, InitializeResult, ServerCapabilities, TextDocumentSyncKind } from 'vscode-languageserver';
import Parser from '../../tree-sitter/tree-sitter';
import { Trees } from './trees';
import { DocumentSymbols } from './features/documentSymbols';
import { SymbolIndex } from './features/symbolIndex';
import { SelectionRangesProvider } from './features/selectionRanges';
import { CompletionItemProvider } from './features/completions';
import { WorkspaceSymbol } from './features/workspaceSymbols';
import { DefinitionProvider } from './features/definitions';
import { ReferencesProvider } from './features/references';
import { Validation } from './features/validation';
import { DocumentStore } from './documentStore';

type InitOptions = {
	treeSitterWasmUri: string;
	supportedLanguages: { languageId: string, wasmUri: string, suffixes: string[] }[]
};

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {

	// (1) init tree sitter before doing anything else
	await Parser.init({
		locateFile() {
			return (<InitOptions>params.initializationOptions).treeSitterWasmUri;
		}
	});

	// (2) setup features
	const documents = new DocumentStore(connection);
	const trees = new Trees(documents, (<InitOptions>params.initializationOptions).supportedLanguages);
	const symbolIndex = new SymbolIndex(trees, documents);

	new WorkspaceSymbol(symbolIndex).register(connection);
	new DocumentSymbols(documents, symbolIndex).register(connection);
	new DefinitionProvider(documents, trees, symbolIndex).register(connection);
	new ReferencesProvider(trees, symbolIndex).register(connection);
	new CompletionItemProvider(symbolIndex).register(connection);
	new SelectionRangesProvider(documents, trees).register(connection);
	new Validation(connection, documents, trees);

	const capabilities: ServerCapabilities = {
		textDocumentSync: TextDocumentSyncKind.Incremental,
		workspaceSymbolProvider: true,
		documentSymbolProvider: true,
		definitionProvider: true,
		referencesProvider: true,
		completionProvider: {},
		selectionRangeProvider: true,
	};

	// (nth) manage symbol index. add/remove files as they are disovered and edited
	documents.all().forEach(doc => symbolIndex.addFile(doc.uri));
	documents.onDidOpen(event => symbolIndex.addFile(event.document.uri));
	documents.onDidChangeContent(event => symbolIndex.addFile(event.document.uri));
	connection.onNotification('queue/remove', uris => symbolIndex.removeFile(uris));
	connection.onNotification('queue/add', uris => symbolIndex.addFile(uris));
	connection.onRequest('queue/init', uris => {
		symbolIndex.addFile(uris);
		return symbolIndex.update();
	});

	return { capabilities };
});


connection.listen();
