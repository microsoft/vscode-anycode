/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const outline = `
(interface_declaration
	name: (type_identifier) @definition.interface.name
) @definition.interface

(property_signature
	name: (property_identifier) @definition.field.name
) @definition.field

(method_signature
	name: (property_identifier) @definition.method.name
) @definition.method

(class_declaration
	name: (type_identifier) @definition.class.name
) @definition.class

(new_expression
	constructor: (class
		body: (class_body)
	) @definition.class
)

(method_definition
	name: [
		(property_identifier) @definition.method.name
		(computed_property_name (string) @definition.method.name)
	]
) @definition.method

(public_field_definition
	name: [
		(property_identifier) @definition.field.name
		(computed_property_name (string) @definition.field.name)
	]
) @definition.field

(enum_declaration
	name: (identifier) @definition.enum.name
) @definition.enum

(enum_body [
	(property_identifier) @definition.enumMember
	(enum_assignment (property_identifier) @definition.enumMember)
])

(function_declaration
	name: (identifier) @definition.function.name
) @definition.function

(variable_declarator
	name: (identifier) @definition.variable.name
) @definition.variable

(module
	name: [(identifier)@definition.module.name (string) @definition.module.name]
) @definition.module
`;


export const mod: QueryModule = {
	outline
};

export default mod;
