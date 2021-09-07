/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDocument } from './common';
import { LRUMap } from "./util/lruMap";
import Parser from '../../tree-sitter/tree-sitter';
import { Disposable, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';


// class Utils {

// 	static parseAsync(parser: Parser, text: string, oldTree: Parser.Tree | undefined, token: vscode.CancellationToken): Promise<Parser.Tree> {
// 		if (!parser.getLanguage()) {
// 			throw new Error('no language');
// 		}

// 		const sw = new StopWatch();

// 		// pause parsing after timeout (50ms) and then resume after 
// 		// short timeout, do 20 rounds before giving up
// 		const options = { timeout: 50, rounds: 20 };
// 		return new Promise<Parser.Tree>((resolve, reject) => {

// 			parser.setTimeoutMicros(1000 * options.timeout);
// 			sw.reset();

// 			(function parseStep() {
// 				try {
// 					const tree = parser.parse(text, oldTree);
// 					resolve(tree);
// 				} catch (err) {
// 					if (token?.isCancellationRequested) {
// 						reject(new Error('cancelled'));
// 					} else if (--options.rounds <= 0) {
// 						reject(new Error('timeout'));
// 					} else {
// 						setTimeout(() => parseStep(), 0);
// 					}
// 				}
// 			})();

// 		}).finally(() => {
// 			// sw.elapsed(`new TREE, ${options.rounds} rounds left`);
// 		});
// 	}

// 	static asEdits(event: vscode.TextDocumentChangeEvent): Parser.Edit[] {
// 		return event.contentChanges.map(change => ({
// 			startPosition: asTsPoint(change.range.start),
// 			oldEndPosition: asTsPoint(change.range.end),
// 			newEndPosition: asTsPoint(event.document.positionAt(change.rangeOffset + change.text.length)),
// 			startIndex: change.rangeOffset,
// 			oldEndIndex: change.rangeOffset + change.rangeLength,
// 			newEndIndex: change.rangeOffset + change.text.length
// 		}));
// 	}
// }

class Entry {
	constructor(
		public version: number,
		public tree: Parser.Tree,
		public edits: Parser.Edit[][]
	) { }

	dispose() {
		this.tree.delete();
	}
}

export class Trees {

	private readonly _cache = new LRUMap<IDocument, Entry>(100);

	private readonly _languages = new Map<string, { wasmUri: string, language?: Promise<Parser.Language> }>();

	private readonly _listener: Disposable[] = [];

	constructor(documents: TextDocuments<TextDocument>, languages: { languageId: string, wasmUri: string }[]) {

		// supported languages
		for (let item of languages) {
			this._languages.set(item.languageId, { wasmUri: item.wasmUri });
		}

		// remove closed documents
		documents.onDidClose(e => {
			const info = this._cache.get(e.document);
			if (info) {
				info.dispose();
				this._cache.delete(e.document);
			}
		}, undefined, this._listener);

		// todo@jrieken
		// build edits when document changes
		// documents.onDidChangeContent(e => {
		// 	const info = this._cache.get(e.document);
		// 	if (info) {
		// 		info.edits.push(Utils.asEdits(event));
		// 	}
		// }, undefined, this._listener);
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
			entry.language = Parser.Language.load(entry.wasmUri);

		}
		return entry.language;
	}

	// --- tree/parse

	async getParseTree(document: IDocument): Promise<Parser.Tree | undefined> {

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
		try {
			const version = document.version;
			const text = document.getText();

			parser.setTimeoutMicros(1000 * 1000); // parse max 1sec
			const tree = parser.parse(text);

			if (!info) {
				info = new Entry(
					version,
					tree,
					[]
				);
				this._cache.set(document, info);

				// cleanup MRU cache
				for (let [, value] of this._cache.cleanup()) {
					value.dispose();
				}
			} else {
				info.tree = tree;
			}
			return info.tree;

		} catch (e) {
			console.error(e);
			this._cache.delete(document);
			return undefined;
		} finally {
			parser.delete();
		}
	}

	// private async _updateTree(parser: Parser, entry: Entry, document: IDocument, token: vscode.CancellationToken): Promise<Parser.Tree> {
	// 	const tree = await entry.tree;
	// 	if (entry.edits.length === 0) {
	// 		return tree;
	// 	}

	// 	// apply edits and parse again
	// 	const deltas = entry.edits.flat();
	// 	deltas.forEach(tree.edit, tree);
	// 	entry.edits.length = 0;
	// 	entry.version = document.version;
	// 	entry.tree = Utils.parseAsync(parser, document.getText(), tree, token).finally(() => {
	// 		// this is now an old tree and can be deleted
	// 		tree.delete();
	// 	});

	// 	// restart in cause more edits happened while parsing...
	// 	return this._updateTree(parser, entry, document, token);
	// }
};
