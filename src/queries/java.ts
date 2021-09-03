/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const queries =`

;; --- SYMBOLS ---

(class_declaration
	name: (identifier) @symbol.class.name
) @symbol.class

(variable_declarator
	name: (identifier) @symbol.class.name
	value: (object_creation_expression
		.
		(_)*
		(class_body)
	)
) @symbol.class

(interface_declaration
	name: (identifier) @symbol.interface.name
) @symbol.interface

(enum_declaration
	name: (identifier) @symbol.enum.name
) @symbol.enum

(enum_constant
	name: (identifier) @symbol.enumMember.name
) @symbol.enumMember

(constructor_declaration
	name: (identifier) @symbol.constructor.name
) @symbol.constructor

(method_declaration
	name: (identifier) @symbol.method.name
) @symbol.method

(field_declaration
	declarator: ((variable_declarator 
		name: (identifier) @symbol.field.name)
	) @symbol.field
)

(module_declaration
	[
		(scoped_identifier) @symbol.module.name
		(identifier) @symbol.module.name
	]
) @symbol.module

;; --- USAGES ---

(field_access
	field: (identifier) @usage.field
)

(method_invocation
	name: (identifier) @usage.call
)

(object_creation_expression
	type: [
		(type_identifier) @usage.constructor
		(generic_type (type_identifier)) @usage.contructor
	]
)

(interface_type_list
	(type_identifier) @usage.interface
)

(superclass
	(type_identifier) @symbol.usage.class
)

(formal_parameter
	type: (type_identifier) @symbol.usage
)

(local_variable_declaration
	type: (type_identifier) @symbol.usage
)

(type_arguments
	(type_identifier) @symbol.usage
)

(wildcard
	(type_identifier) @symbol.usage
)
`;
