/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from "../queries";

const documentSymbols = `(class_definition
	name: (identifier) @symbol.class.name
) @symbol.class

(function_definition
	name: (identifier) @symbol.function.name
) @symbol.function`;


const comments = `
(comment) @comment
`;

export const mod: QueryModule = {
	documentSymbols,
	comments
};

export default mod;
