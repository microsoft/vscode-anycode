/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { CommonLanguageClient, LanguageClientOptions, RevealOutputChannelOn } from 'vscode-languageclient';
import { LanguageClient } from 'vscode-languageclient/browser';
import { startClient, LanguageClientFactory } from '../client';

export async function activate(context: vscode.ExtensionContext) {

	const factory = new class implements LanguageClientFactory {

		private readonly _map = new Map<CommonLanguageClient, Worker>();

		createLanguageClient(id: string, name: string, clientOptions: LanguageClientOptions): CommonLanguageClient {
			const serverMain = vscode.Uri.joinPath(context.extensionUri, 'dist/anycode.server.browser.js');
			const worker = new Worker(serverMain.toString());
			const result = new LanguageClient(id, name, clientOptions, worker);
			this._map.set(result, worker);
			return result;
		}
		destoryLanguageClient(client: CommonLanguageClient): void {
			const worker = this._map.get(client);
			if (worker) {
				worker.terminate();
				this._map.delete(client);
			}
		}
	};

	return startClient(factory, context);
}
