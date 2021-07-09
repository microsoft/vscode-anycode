/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export = `
(class_declaration
	name: (identifier) @class_name
) @class

(interface_declaration 
	name: (identifier) @interface_name
) @interface

(record_declaration 
	name: (identifier) @record_name
) @record

(constructor_declaration
	name: (identifier) @method_name
) @method

(method_declaration
	name: (identifier) @method_name
) @method

(property_declaration
	name: (identifier) @property_name
) @property

(field_declaration
	(variable_declaration
    	(variable_declarator
        	(identifier) @field_name
        )
    )
) @field

(enum_declaration name: (identifier) @enum_name) @enum
(struct_declaration (identifier) @struct_name) @struct
(namespace_declaration name: (identifier) @module_name) @module
(enum_member_declaration (identifier) @enumMember_name) @enumMember`;
