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

			const client = new LanguageClient(id, serverOptions, clientOptions);

			// support file-based symbol storage
			client.onReady().then(() => {
				const persistUri = context.storageUri && vscode.Uri.joinPath(context.storageUri, 'anycode.db');
				const encoder = new TextEncoder();
				const decoder = new TextDecoder();

				client.onRequest('persisted/read', async (): Promise<string> => {
					if (!persistUri) {
						return '';
					}
					try {
						const data = await vscode.workspace.fs.readFile(persistUri);
						return decoder.decode(data);
					} catch {
						return '';
					}
				});
				client.onRequest('persisted/write', async (json: string) => {
					if (persistUri) {
						const data = encoder.encode(json);
						await vscode.workspace.fs.writeFile(persistUri, new Uint8Array(data));
					}
				});
			});

			return client;
		}
		destoryLanguageClient(client: CommonLanguageClient): void {
			if (client instanceof LanguageClient) {
				client.stop();
			}
		}
	};

	return startClient(factory, context);
}
