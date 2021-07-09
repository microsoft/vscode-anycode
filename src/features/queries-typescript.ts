/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export = `
(interface_declaration
	name: (type_identifier) @interface_name
) @interface

(property_signature
	name: (property_identifier) @field_name
) @field

(method_signature
	name: (property_identifier) @method_name
) @method

(class_declaration
	name: (type_identifier) @class_name
) @class

(new_expression
	constructor: (class 
		body: (class_body) 
	) @class
)

(method_definition
	name: [
    	(property_identifier) @method_name
        (computed_property_name (string) @method_name)
    ]
) @method

(public_field_definition
	name: [
    	(property_identifier) @field_name
        (computed_property_name (string) @field_name)
    ]
) @field

(enum_declaration
	name: (identifier) @enum_name
) @enum

(enum_body [
	(property_identifier) @enumMember
	(enum_assignment (property_identifier) @enumMember)
])

(function_declaration
	name: (identifier) @function_name
) @function

(variable_declarator
	name: (identifier) @variable_name
) @variable

(module
	name: [(identifier)@module_name (string) @module_name]
) @module
`;
