/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export = `(class_declaration
	name: (identifier) @class_name
) @class

(variable_declarator
	name: (identifier) @class_name
	value: (object_creation_expression
		.
		(_)*
		(class_body)
	)
) @class

(interface_declaration
	name: (identifier) @interface_name
) @interface

(enum_declaration
	name: (identifier) @enum_name
) @enum

(method_declaration
	name: (identifier) @method_name
) @method

(field_declaration
	declarator: ((variable_declarator 
		name: (identifier) @field_name)
	)
) @field`;
