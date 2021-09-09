/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from "../queries";

const documentSymbols =`
(namespace_definition
	name: (identifier) @symbol.module.name
) @symbol.module

(declaration
	type: (primitive_type)
	declarator: (identifier) @symbol.variable.name
) @symbol.variable

(friend_declaration
	(type_identifier) @symbol.variable.name
) @symbol.variable

(function_definition
	(function_declarator
		[
			(identifier) @symbol.function.name
			(field_identifier) @symbol.function.name
			(scoped_identifier) @symbol.function.name
		]
	)
) @symbol.function

(field_declaration
	(function_declarator
		[
			(identifier) @symbol.function.name
			(field_identifier) @symbol.function.name
			(scoped_identifier) @symbol.function.name
		]
	)
) @symbol.function

(declaration
	(function_declarator
		[
			(identifier) @symbol.function.name
			(field_identifier) @symbol.function.name
			(scoped_identifier) @symbol.function.name
			(destructor_name) @symbol.function.name
		]
	)
) @symbol.function

(pointer_declarator
	declarator: (function_declarator
		declarator: (identifier) @symbol.function.name
	) @symbol.function
)

(field_declaration
	(field_identifier) @symbol.field.name
) @symbol.field

(struct_specifier
	(type_identifier) @symbol.struct.name
) @symbol.struct

(class_specifier
	(type_identifier) @symbol.class.name
) @symbol.class

(type_definition
	type: (_)
	declarator: (type_identifier) @symbol.struct.name
) @symbol.struct
`;


const comments = `
(comment) @comment
`;

export const mod: QueryModule = {
	documentSymbols,
	comments
};

export default mod;
