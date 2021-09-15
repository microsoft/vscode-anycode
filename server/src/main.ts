/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection, BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver/browser';
import { BulkRegistration, InitializeParams, InitializeResult, ServerCapabilities, TextDocumentSyncKind, DocumentSymbolRequest } from 'vscode-languageserver';
import Parser from '../tree-sitter/tree-sitter';
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
import Languages from './languages';
import { FoldingRangeProvider } from './features/foldingRanges';
import { DocumentHighlightsProvider } from './features/documentHighlights';

type InitOptions = {
	treeSitterWasmUri: string;
	supportedLanguages: { languageId: string, wasmUri: string, suffixes: string[] }[]
};

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

const features: (DocumentSymbols | DocumentHighlightsProvider)[] = [];

connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {

	// (1) init tree sitter before doing anything else
	await Parser.init({
		locateFile() {
			return (<InitOptions>params.initializationOptions).treeSitterWasmUri;
		}
	});

	// (2) init supported languages and its queries
	await Languages.init((<InitOptions>params.initializationOptions).supportedLanguages);

	// (2) setup features
	const documents = new DocumentStore(connection);
	const trees = new Trees(documents);
	const symbolIndex = new SymbolIndex(trees, documents);

	new WorkspaceSymbol(symbolIndex).register(connection);
	const documentSymbols = new DocumentSymbols(documents, trees);
	documentSymbols.register(connection);
	features.push(documentSymbols);

	new DefinitionProvider(documents, trees, symbolIndex).register(connection);
	new ReferencesProvider(documents, trees, symbolIndex).register(connection);

	const highlight = new DocumentHighlightsProvider(documents, trees);
	highlight.register(connection);
	features.push(highlight);

	new CompletionItemProvider(symbolIndex).register(connection);
	new SelectionRangesProvider(documents, trees).register(connection);
	new FoldingRangeProvider(documents, trees).register(connection);
	new Validation(connection, documents, trees);

	const capabilities: ServerCapabilities = {
		textDocumentSync: TextDocumentSyncKind.Incremental,
		// workspaceSymbolProvider: true,
		// documentSymbolProvider: true,
		// definitionProvider: true,
		// referencesProvider: true,
		// documentHighlightProvider: true,
		// completionProvider: {},
		// selectionRangeProvider: true,
		// foldingRangeProvider: true,
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

connection.onInitialized(async () => {
	const bulk = BulkRegistration.create();
	for (const feature of features) {
		feature.collectRegistrations(bulk);
	}
	connection.client.register(bulk);
});


connection.listen();
