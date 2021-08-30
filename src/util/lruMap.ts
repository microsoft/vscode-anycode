/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// ghetto LRU that utilizes the fact that Map keeps things in insertion order
export class LRUMap<K, V> extends Map<K, V> {

	private readonly _cacheLimits = { max: 45, size: 30 };

	constructor(size: number = 30) {
		super();
		this._cacheLimits = { size, max: Math.round(size * 1.3) };
	}

	get(key: K): V | undefined {
		if (!this.has(key)) {
			return undefined;
		}
		const result = super.get(key);
		this.delete(key);
		this.set(key, result!);
		return result;
	}

	cleanup(): [K, V][] {
		if (this.size < this._cacheLimits.max) {
			return [];
		}
		const result = Array.from(this.entries()).slice(0, this._cacheLimits.size);
		for (let [key] of result) {
			this.delete(key);
		}
		return result;
	}
}
