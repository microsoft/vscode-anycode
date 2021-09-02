/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const symbols =`(class_declaration
	name: (identifier) @class.name
) @class

(variable_declarator
	name: (identifier) @class.name
	value: (object_creation_expression
		.
		(_)*
		(class_body)
	)
) @class

(interface_declaration
	name: (identifier) @interface.name
) @interface

(enum_declaration
	name: (identifier) @enum.name
) @enum

(enum_constant
	name: (identifier) @enumMember.name
) @enumMember

(constructor_declaration
	name: (identifier) @constructor.name
) @constructor

(method_declaration
	name: (identifier) @method.name
) @method

(field_declaration
	declarator: ((variable_declarator 
		name: (identifier) @field.name)
	) @field
)

(module_declaration
	[
		(scoped_identifier) @module.name
		(identifier) @module.name
	]
) @module
`;

export const usage = `
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
	(type_identifier) @usage.class
)

(formal_parameter
	type: (type_identifier) @usage
)

(local_variable_declaration
	type: (type_identifier) @usage
)

(type_arguments
	(type_identifier) @usage
)

(wildcard
	(type_identifier) @usage
)
`;
