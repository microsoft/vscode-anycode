/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { asTsPoint, IDocument, ITrees, StopWatch } from './common';
import { LRUMap } from "./util/lruMap";
import Parser from '../tree-sitter/tree-sitter';
import { SupportedLanguages } from './supportedLanguages';

class Utils {

	static parseAsync(parser: Parser, text: string, oldTree: Parser.Tree | undefined, token: vscode.CancellationToken): Promise<Parser.Tree> {
		if (!parser.getLanguage()) {
			throw new Error('no language');
		}

		const sw = new StopWatch();

		// pause parsing after timeout (50ms) and then resume after 
		// short timeout, do 20 rounds before giving up
		const options = { timeout: 50, rounds: 20 };
		return new Promise<Parser.Tree>((resolve, reject) => {

			parser.setTimeoutMicros(1000 * options.timeout);
			sw.reset();

			(function parseStep() {
				try {
					const tree = parser.parse(text, oldTree);
					resolve(tree);
				} catch (err) {
					if (token?.isCancellationRequested) {
						reject(new Error('cancelled'));
					} else if (--options.rounds <= 0) {
						reject(new Error('timeout'));
					} else {
						setTimeout(() => parseStep(), 0);
					}
				}
			})();

		}).finally(() => {
			sw.elapsed(`new TREE, ${options.rounds} rounds left`);
		});
	}

	static asEdits(event: vscode.TextDocumentChangeEvent): Parser.Edit[] {
		return event.contentChanges.map(change => ({
			startPosition: asTsPoint(change.range.start),
			oldEndPosition: asTsPoint(change.range.end),
			newEndPosition: asTsPoint(event.document.positionAt(change.rangeOffset + change.text.length)),
			startIndex: change.rangeOffset,
			oldEndIndex: change.rangeOffset + change.rangeLength,
			newEndIndex: change.rangeOffset + change.text.length
		}));
	}
}

class Entry {
	constructor(
		public version: number,
		public tree: Promise<Parser.Tree>,
		public edits: Parser.Edit[][]
	) { }

	dispose() {
		this.tree.then(tree => tree.delete());
	}
}

export class Trees implements ITrees {

	private readonly _cache = new LRUMap<IDocument, Entry>(100);

	private readonly _languages = new Map<string, { uri: vscode.Uri, language?: Promise<Parser.Language> }>();
	private readonly _listener: vscode.Disposable[] = [];

	constructor(languages: SupportedLanguages) {

		// supported languages
		for (let item of languages.getSupportedLanguages()) {
			this._languages.set(item.languageId, { uri: item.wasmUri });
		}
		languages.onDidChange(() => {
			const current = new Map(this._languages);
			this._languages.clear();
			for (let item of languages.getSupportedLanguages()) {
				this._languages.set(item.languageId, { uri: item.wasmUri, language: current.get(item.languageId)?.language });
			}
		}, undefined, this._listener);

		// remove closed documents
		vscode.workspace.onDidCloseTextDocument(doc => {
			const info = this._cache.get(doc);
			if (info) {
				info.dispose();
				this._cache.delete(doc);
			}
		}, undefined, this._listener);

		// build edits when document changes
		vscode.workspace.onDidChangeTextDocument(event => {
			const info = this._cache.get(event.document);
			if (info) {
				info.edits.push(Utils.asEdits(event));
			}
		}, undefined, this._listener);
	}

	dispose(): void {
		for (let item of this._cache.values()) {
			item.dispose();
		}
		for (let item of this._listener) {
			item.dispose();
		}
	}

	// --- languages

	get supportedLanguages() {
		return Array.from(this._languages.keys());
	}

	async getLanguage(langId: string): Promise<Parser.Language | undefined> {
		const entry = this._languages.get(langId);
		if (!entry) {
			return undefined;
		}
		if (!entry.language) {
			entry.language = Promise.resolve(vscode.workspace.fs.readFile(entry.uri)).then(data => Parser.Language.load(data));

		}
		return entry.language;
	}

	// --- tree/parse

	async getParseTree(document: IDocument, token: vscode.CancellationToken): Promise<Parser.Tree | undefined> {

		const language = await this.getLanguage(document.languageId);
		if (!language) {
			return undefined;
		}

		let info = this._cache.get(document);
		if (info?.version === document.version) {
			return info.tree;
		}

		const parser = new Parser();
		parser.setLanguage(language);

		const version = document.version;
		const text = document.getText();

		if (!info) {
			info = new Entry(
				version,
				Utils.parseAsync(parser, text, undefined, token),
				[]
			);
			this._cache.set(document, info);

			// cleanup MRU cache
			for (let [, value] of this._cache.cleanup()) {
				value.dispose();
			}
		}

		info.tree = this._updateTree(parser, info, document, token);

		return info.tree.finally(() => parser.delete());
	}

	private async _updateTree(parser: Parser, entry: Entry, document: IDocument, token: vscode.CancellationToken): Promise<Parser.Tree> {
		const tree = await entry.tree;
		if (entry.edits.length === 0) {
			return tree;
		}

		// apply edits and parse again
		const deltas = entry.edits.flat();
		deltas.forEach(tree.edit, tree);
		entry.edits.length = 0;
		entry.version = document.version;
		entry.tree = Utils.parseAsync(parser, document.getText(), tree, token).finally(() => {
			// this is now an old tree and can be deleted
			tree.delete();
		});

		// restart in cause more edits happened while parsing...
		return this._updateTree(parser, entry, document, token);
	}
};
