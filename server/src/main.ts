/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createConnection, BrowserMessageReader, BrowserMessageWriter } from 'vscode-languageserver/browser';
import { Connection, InitializeParams, InitializeResult, TextDocumentSyncKind } from 'vscode-languageserver';
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
import { LanguageConfiguration } from './common';

type InitOptions = {
	treeSitterWasmUri: string;
	supportedLanguages: LanguageConfiguration
};

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

// patch console.log/warn/error calls
console.log = connection.console.log.bind(connection.console);
console.warn = connection.console.warn.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

const features: { register(connection: Connection): any }[] = [];

connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {

	const initData = <InitOptions>params.initializationOptions;

	// (1) init tree sitter and languages before doing anything else
	const options: object | undefined = {
		locateFile() {
			return initData.treeSitterWasmUri;
		}
	};
	await Parser.init(options);
	await Languages.init(initData.supportedLanguages);

	// (2) setup features
	const documents = new DocumentStore(connection);
	const trees = new Trees(documents);
	const symbolIndex = new SymbolIndex(trees, documents);

	features.push(new WorkspaceSymbol(symbolIndex));
	features.push(new DocumentSymbols(documents, trees));
	features.push(new DefinitionProvider(documents, trees, symbolIndex));
	features.push(new ReferencesProvider(documents, trees, symbolIndex));
	features.push(new DocumentHighlightsProvider(documents, trees));
	features.push(new CompletionItemProvider(documents, trees, symbolIndex));
	features.push(new SelectionRangesProvider(documents, trees));
	features.push(new FoldingRangeProvider(documents, trees));
	new Validation(connection, documents, trees);

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

	console.log('Tree-sitter, languages, and features are READY');

	return {
		capabilities: { textDocumentSync: TextDocumentSyncKind.Incremental }
	};
});

connection.onInitialized(async () => {
	for (let feature of features) {
		feature.register(connection);
	}
});

connection.listen();
