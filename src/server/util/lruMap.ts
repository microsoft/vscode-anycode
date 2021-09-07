/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// ghetto LRU that utilizes the fact that Map keeps things in insertion order
export class LRUMap<K, V> extends Map<K, V> {

	constructor(private readonly _options: { size: number, dispose: (entries: [K, V][]) => void }) {
		super();
	}

	get(key: K): V | undefined {
		if (!this.has(key)) {
			return undefined;
		}
		const result = super.get(key);
		this.delete(key);
		this.set(key, result!);
		setTimeout(() => {
			if (this.size < Math.ceil(this._options.size * 1.3)) {
				return;
			}
			const result = Array.from(this.entries()).slice(0, this._options.size);
			for (let [key] of result) {
				this.delete(key);
			}
			this._options.dispose(result);
		}, 0);
		return result;
	}

}
