/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Connection, FileChangeType, InitializeParams, InitializeResult, TextDocumentSyncKind } from 'vscode-languageserver';
import Parser from 'web-tree-sitter';
import type { InitOptions } from '../../../shared/common/initOptions';
import { DocumentStore } from './documentStore';
import { CompletionItemProvider } from './features/completions';
import { DefinitionProvider } from './features/definitions';
import { DocumentHighlightsProvider } from './features/documentHighlights';
import { DocumentSymbols } from './features/documentSymbols';
import { FoldingRangeProvider } from './features/foldingRanges';
import { ReferencesProvider } from './features/references';
import { SelectionRangesProvider } from './features/selectionRanges';
import { SymbolInfoStorage, SymbolIndex } from './features/symbolIndex';
import { Validation } from './features/validation';
import { WorkspaceSymbol } from './features/workspaceSymbols';
import Languages from './languages';
import { Trees } from './trees';

export interface IStorageFactory {
	create(name: string): Promise<SymbolInfoStorage>
	destroy(index: SymbolInfoStorage): Promise<void>
}

export function startServer(connection: Connection, factory: IStorageFactory) {

	// patch console.log/warn/error calls
	console.log = connection.console.log.bind(connection.console);
	console.warn = connection.console.warn.bind(connection.console);
	console.error = connection.console.error.bind(connection.console);

	const features: { register(connection: Connection): any }[] = [];

	connection.onInitialize(async (params: InitializeParams): Promise<InitializeResult> => {

		const initData = <InitOptions><unknown>params.initializationOptions;

		// init tree sitter and languages before doing anything else
		const options: object | undefined = {
			locateFile() {
				return initData.treeSitterWasmUri;
			}
		};
		await Parser.init(options);
		await Languages.init(initData.supportedLanguages);

		// setup features
		const documents = new DocumentStore(connection);
		const trees = new Trees(documents);

		// caching
		const persistedCache = await factory.create(initData.databaseName);
		connection.onExit(() => factory.destroy(persistedCache));

		const symbolIndex = new SymbolIndex(trees, documents, persistedCache);

		features.push(new WorkspaceSymbol(documents, trees, symbolIndex));
		features.push(new DefinitionProvider(documents, trees, symbolIndex));
		features.push(new ReferencesProvider(documents, trees, symbolIndex));
		features.push(new CompletionItemProvider(documents, trees, symbolIndex));
		features.push(new DocumentHighlightsProvider(documents, trees));
		features.push(new DocumentSymbols(documents, trees));
		features.push(new SelectionRangesProvider(documents, trees));
		features.push(new FoldingRangeProvider(documents, trees));
		new Validation(connection, documents, trees);

		// manage symbol index. add/remove files as they are disovered and edited
		documents.all().forEach(doc => symbolIndex.addFile(doc.uri));
		documents.onDidOpen(event => symbolIndex.addFile(event.document.uri));
		documents.onDidChangeContent(event => symbolIndex.addFile(event.document.uri));
		connection.onRequest('queue/init', uris => {
			return symbolIndex.initFiles(uris);
		});

		connection.onDidChangeWatchedFiles(e => {
			for (const { type, uri } of e.changes) {
				switch (type) {
					case FileChangeType.Created:
						symbolIndex.addFile(uri);
						break;
					case FileChangeType.Deleted:
						symbolIndex.removeFile(uri);
						documents.removeFile(uri);
						break;
					case FileChangeType.Changed:
						symbolIndex.addFile(uri);
						documents.removeFile(uri);
						break;
				}
			}
		});

		console.log('Tree-sitter, languages, and features are READY');

		return {
			capabilities: { textDocumentSync: TextDocumentSyncKind.Incremental }
		};
	});

	connection.onInitialized(() => {
		for (let feature of features) {
			feature.register(connection);
		}
	});

	connection.listen();
}
