/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const queries = `
(mod_item
	name: (identifier) @symbol.module.name
) @symbol.module

(function_item
	name: (identifier) @symbol.function.name
) @symbol.function

(union_item
	name: (type_identifier) @symbol.struct.name
) @symbol.struct

(field_declaration
	name: (field_identifier) @symbol.field.name
) @symbol.field

(struct_item
	name: (type_identifier) @symbol.struct.name
) @symbol.struct

(enum_item
	name: (type_identifier) @symbol.enum.name
) @symbol.enum

(enum_variant
	name: (identifier) @symbol.enumMember.name
) @symbol.enumMember

(trait_item
	name: (type_identifier) @symbol.interface.name
) @symbol.interface

(function_signature_item
	name: (identifier) @symbol.function.name
) @symbol.function

(const_item
	name: (identifier) @symbol.constant.name
) @symbol.constant

(static_item
	name: (identifier) @symbol.constant.name
) @symbol.constant

(type_item
	name: (type_identifier) @symbol.interface.name
) @symbol.interface

(impl_item
	type: (type_identifier) @symbol.class.name
) @symbol.class

(foreign_mod_item
	[
		(extern_modifier (string_literal) @symbol.namespace.name)
		(extern_modifier) @symbol.namespace.name
	]
) @symbol.namespace
`;
