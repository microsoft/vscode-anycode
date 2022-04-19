/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { CommonLanguageClient, LanguageClientOptions } from 'vscode-languageclient';
import { LanguageClient, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { startClient, LanguageClientFactory } from '../client';

export async function activate(context: vscode.ExtensionContext) {

	const factory = new class implements LanguageClientFactory {

		createLanguageClient(id: string, name: string, clientOptions: LanguageClientOptions): CommonLanguageClient {
			const serverModule = vscode.Uri.joinPath(context.extensionUri, 'dist/anycode.server.node.js').fsPath;


			// The debug options for the server
			const debugOptions = { execArgv: ['--nolazy', '--inspect=' + (7000 + Math.round(Math.random() * 999))] };

			// If the extension is launch in debug mode the debug server options are use
			// Otherwise the run options are used
			const serverOptions: ServerOptions = {
				run: { module: serverModule, transport: TransportKind.ipc },
				debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
			};

			const result = new LanguageClient(id, serverOptions, clientOptions);
			return result;
		}
		destoryLanguageClient(client: CommonLanguageClient): void {
			if (client instanceof LanguageClient) {
				client.stop();
			}
		}
	};

	return startClient(factory, context);
}
