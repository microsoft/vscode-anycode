/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare const performance: { now(): number }

declare class TextEncoder {
	encode(value: string): Uint8Array;
}
declare class TextDecoder {
	decode(data: Uint8Array): string;
}
