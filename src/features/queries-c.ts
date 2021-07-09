/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export = `
(struct_specifier
    name: (type_identifier) @struct_name
) @struct

(union_specifier
    name: (type_identifier) @struct_name
) @struct

(enum_specifier
    name: (type_identifier) @enum_name
) @enum

(enumerator
	name: (identifier) @enumMember_name
) @enumMember

(function_declarator
	declarator: (identifier) @function_name
) @function

(type_definition
	.
	type: (_)
	declarator: (type_identifier) @struct_name
) @struct

(field_declaration_list
	(field_declaration
		declarator: (field_identifier) @field_name
	) @field
)`;
