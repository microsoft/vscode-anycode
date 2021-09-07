/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const queries = `(class_definition
	name: (identifier) @symbol.class.name
) @symbol.class

(function_definition
	name: (identifier) @symbol.function.name
) @symbol.function`;
