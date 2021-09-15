/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const outline = `(class_declaration
	name: (name) @definition.class.name
) @definition.class

(method_declaration
  name: (name) @definition.method.name
) @definition.method

(property_element
	(variable_name) @definition.property.name
) @definition.property

(function_definition
	name: (name) @definition.function.name
) @definition.function

(trait_declaration
	name: (name) @definition.property.name
) @definition.property`;


const comments = `
(comment) @comment
`;

export const mod: QueryModule = {
	outline,
	comments
};

export default mod;
