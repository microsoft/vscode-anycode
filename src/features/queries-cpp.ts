/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const symbols =`(namespace_definition
	name: (identifier) @module.name
) @module

(declaration
	type: (primitive_type)
	declarator: (identifier) @variable.name
) @variable

(friend_declaration
	(type_identifier) @variable.name
) @variable

(function_definition
	(function_declarator
		[
			(identifier) @function.name
			(field_identifier) @function.name
			(scoped_identifier) @function.name
		]
	)
) @function

(field_declaration
	(function_declarator
		[
			(identifier) @function.name
			(field_identifier) @function.name
			(scoped_identifier) @function.name
		]
	)
) @function

(declaration
	(function_declarator
		[
			(identifier) @function.name
			(field_identifier) @function.name
			(scoped_identifier) @function.name
			(destructor_name) @function.name
		]
	)
) @function

(field_declaration
	(field_identifier) @field.name
) @field

(struct_specifier
	(type_identifier) @struct.name
) @struct

(class_specifier
	(type_identifier) @class.name
) @class

(type_definition
	type: (_)
	declarator: (type_identifier) @struct.name
) @struct
`;
