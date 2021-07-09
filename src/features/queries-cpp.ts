/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export = `(namespace_definition
	name: (identifier) @module_name
) @module

(declaration
    type: (primitive_type)
    declarator: (identifier) @variable_name
) @variable

(friend_declaration
	(type_identifier) @variable_name
) @variable

(function_declarator
	[(identifier) @function_name (field_identifier) @function_name]
) @function

(struct_specifier
	(type_identifier) @struct_name
) @struct

(field_declaration
	(field_identifier) @field_name
) @field

(class_specifier
    (type_identifier) @class_name
) @class
`;
