/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const queries = `
(interface_declaration
	name: (type_identifier) @symbol.interface.name
) @symbol.interface

(property_signature
	name: (property_identifier) @symbol.field.name
) @symbol.field

(method_signature
	name: (property_identifier) @symbol.method.name
) @symbol.method

(class_declaration
	name: (type_identifier) @symbol.class.name
) @symbol.class

(new_expression
	constructor: (class 
		body: (class_body) 
	) @symbol.class
)

(method_definition
	name: [
		(property_identifier) @symbol.method.name
		(computed_property_name (string) @symbol.method.name)
	]
) @symbol.method

(public_field_definition
	name: [
		(property_identifier) @symbol.field.name
		(computed_property_name (string) @symbol.field.name)
	]
) @symbol.field

(enum_declaration
	name: (identifier) @symbol.enum.name
) @symbol.enum

(enum_body [
	(property_identifier) @symbol.enumMember
	(enum_assignment (property_identifier) @symbol.enumMember)
])

(function_declaration
	name: (identifier) @symbol.function.name
) @symbol.function

(variable_declarator
	name: (identifier) @symbol.variable.name
) @symbol.variable

(module
	name: [(identifier)@symbol.module.name (string) @symbol.module.name]
) @symbol.module
`;
