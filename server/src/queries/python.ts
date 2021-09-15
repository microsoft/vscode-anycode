/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const outline = `(class_definition
	name: (identifier) @definition.class.name
) @definition.class

(function_definition
	name: (identifier) @definition.function.name
) @definition.function`;


const comments = `
(comment) @comment
`;

export const mod: QueryModule = {
	outline,
	comments
};

export default mod;
