/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


// FROM https://github.com/microsoft/vscode/blob/559e9beea981b47ffd76d90158ccccafef663324/src/vs/base/common/buffer.ts#L288-L289

const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const base64UrlSafeAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function encodeBase64(buffer: Uint8Array, padded = true, urlSafe = false) {
	const dictionary = urlSafe ? base64UrlSafeAlphabet : base64Alphabet;
	let output = '';

	const remainder = buffer.byteLength % 3;

	let i = 0;
	for (; i < buffer.byteLength - remainder; i += 3) {
		const a = buffer[i + 0];
		const b = buffer[i + 1];
		const c = buffer[i + 2];

		output += dictionary[a >>> 2];
		output += dictionary[(a << 4 | b >>> 4) & 0b111111];
		output += dictionary[(b << 2 | c >>> 6) & 0b111111];
		output += dictionary[c & 0b111111];
	}

	if (remainder === 1) {
		const a = buffer[i + 0];
		output += dictionary[a >>> 2];
		output += dictionary[(a << 4) & 0b111111];
		if (padded) { output += '=='; }
	} else if (remainder === 2) {
		const a = buffer[i + 0];
		const b = buffer[i + 1];
		output += dictionary[a >>> 2];
		output += dictionary[(a << 4 | b >>> 4) & 0b111111];
		output += dictionary[(b << 2) & 0b111111];
		if (padded) { output += '='; }
	}

	return output;
}

export function decodeBase64(encoded: string) {
	let building = 0;
	let remainder = 0;
	let bufi = 0;

	// The simpler way to do this is `Uint8Array.from(atob(str), c => c.charCodeAt(0))`,
	// but that's about 10-20x slower than this function in current Chromium versions.

	const buffer = new Uint8Array(Math.floor(encoded.length / 4 * 3));
	const append = (value: number) => {
		switch (remainder) {
			case 3:
				buffer[bufi++] = building | value;
				remainder = 0;
				break;
			case 2:
				buffer[bufi++] = building | (value >>> 2);
				building = value << 6;
				remainder = 3;
				break;
			case 1:
				buffer[bufi++] = building | (value >>> 4);
				building = value << 4;
				remainder = 2;
				break;
			default:
				building = value << 2;
				remainder = 1;
		}
	};

	for (let i = 0; i < encoded.length; i++) {
		const code = encoded.charCodeAt(i);
		// See https://datatracker.ietf.org/doc/html/rfc4648#section-4
		// This branchy code is about 3x faster than an indexOf on a base64 char string.
		if (code >= 65 && code <= 90) {
			append(code - 65); // A-Z starts ranges from char code 65 to 90
		} else if (code >= 97 && code <= 122) {
			append(code - 97 + 26); // a-z starts ranges from char code 97 to 122, starting at byte 26
		} else if (code >= 48 && code <= 57) {
			append(code - 48 + 52); // 0-9 starts ranges from char code 48 to 58, starting at byte 52
		} else if (code === 43 || code === 45) {
			append(62); // "+" or "-" for URLS
		} else if (code === 47 || code === 95) {
			append(63); // "/" or "_" for URLS
		} else if (code === 61) {
			break; // "="
		} else {
			throw new SyntaxError(`Unexpected base64 character ${encoded[i]}`);
		}
	}

	const unpadded = bufi;
	while (remainder > 0) {
		append(0);
	}

	// slice is needed to account for overestimation due to padding
	return buffer.slice(0, unpadded);
}
