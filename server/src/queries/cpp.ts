/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const definitionsOutline = `
(namespace_definition
	name: (identifier) @definition.module.name
) @definition.module

(declaration
	type: (primitive_type)
	declarator: (identifier) @definition.variable.name
) @definition.variable

(friend_declaration
	(type_identifier) @definition.variable.name
) @definition.variable

(function_definition
	(function_declarator
		[
			(identifier) @definition.function.name
			(field_identifier) @definition.function.name
			(scoped_identifier) @definition.function.name
		]
	)
) @definition.function

(field_declaration
	(function_declarator
		[
			(identifier) @definition.function.name
			(field_identifier) @definition.function.name
			(scoped_identifier) @definition.function.name
		]
	)
) @definition.function

(declaration
	(function_declarator
		[
			(identifier) @definition.function.name
			(field_identifier) @definition.function.name
			(scoped_identifier) @definition.function.name
			(destructor_name) @definition.function.name
		]
	)
) @definition.function

(pointer_declarator
	declarator: (function_declarator
		declarator: (identifier) @definition.function.name
	) @definition.function
)

(field_declaration
	(field_identifier) @definition.field.name
) @definition.field

(struct_specifier
	(type_identifier) @definition.struct.name
) @definition.struct

(class_specifier
	(type_identifier) @definition.class.name
) @definition.class

(type_definition
	type: (_)
	declarator: (type_identifier) @definition.struct.name
) @definition.struct
`;


const comments = `
(comment) @comment
`;

export const mod: QueryModule = {
	definitionsOutline,
	comments
};

export default mod;
