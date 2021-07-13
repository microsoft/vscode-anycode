/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export = `(namespace_definition
	name: (identifier) @module.name
) @module

(declaration
	type: (primitive_type)
	declarator: (identifier) @variable.name
) @variable

(friend_declaration
	(type_identifier) @variable.name
) @variable

(function_declarator
	[(identifier) @function.name (field_identifier) @function.name]
) @function

(struct_specifier
	(type_identifier) @struct.name
) @struct

(field_declaration
	(field_identifier) @field.name
) @field

(class_specifier
	(type_identifier) @class.name
) @class

;; todo@jrieken the struct-name is matched after its children and therefore not associated properly
(type_definition
	type: (_)
	declarator: (type_identifier) @struct.name
) @struct
`;
