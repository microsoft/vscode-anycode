/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isResponseMessage } from 'vscode-jsonrpc/lib/common/messages';
import * as lsp from 'vscode-languageclient';
import { BrowserMessageReader } from 'vscode-languageclient/browser';

// marker type for transferable data
export class TranferableMessage {
	constructor(
		readonly message: any,
		readonly transferable: Transferable[],
	) { }
}

export class TransferableBrowserMessageWriter extends lsp.AbstractMessageWriter implements lsp.MessageWriter {

	private errorCount: number;

	public constructor(private context: Worker | DedicatedWorkerGlobalScope) {
		super();
		this.errorCount = 0;
		context.addEventListener('error', (event) => this.fireError(event));
	}

	public write(msg: lsp.Message): Promise<void> {
		try {
			if (isResponseMessage(msg) && msg.result instanceof TranferableMessage) {
				this.context.postMessage({
					...msg,
					result: msg.result.message
				}, msg.result.transferable);
			} else {
				this.context.postMessage(msg);
			}
			return Promise.resolve();
		} catch (error) {
			this.handleError(error, msg);
			return Promise.reject(error);
		}
	}

	private handleError(error: any, msg: lsp.Message): void {
		this.errorCount++;
		this.fireError(error, msg, this.errorCount);
	}

	public end(): void {
	}
}


export class LanguageClient extends lsp.CommonLanguageClient {

	constructor(id: string, name: string, clientOptions: lsp.LanguageClientOptions, private worker: Worker) {
		super(id, name, clientOptions);
	}

	protected createMessageTransports(_encoding: string): Promise<lsp.MessageTransports> {
		const reader = new BrowserMessageReader(this.worker);
		const writer = new TransferableBrowserMessageWriter(this.worker);
		return Promise.resolve({ reader, writer });
	}

	getLocale() {
		return 'en';
	}
}
