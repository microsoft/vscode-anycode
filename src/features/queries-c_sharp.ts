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

(record_declaration
	(parameter_list
		(parameter
			name: (identifier) @property_name
		) @property
	)
)

(constructor_declaration
	name: (identifier) @method_name
) @method

(destructor_declaration
	(identifier) @method_name
) @method

(indexer_declaration
	(bracketed_parameter_list) @method_name
) @method

(method_declaration
	name: (identifier) @method_name
) @method

(property_declaration
	name: (identifier) @property_name
) @property

(delegate_declaration
	name: (identifier) @function_name
) @function

(field_declaration
	(variable_declaration
    	(variable_declarator
        	(identifier) @field_name
        )
    )
) @field

(event_field_declaration
	(variable_declaration
		(variable_declarator
			(identifier) @event_name
		)
	)
) @event

(global_attribute_list
	(attribute
		(identifier) @constant_name
	) @constant
)

(global_statement
	(local_declaration_statement
		(variable_declaration
			(variable_declarator
				(identifier) @variable_name
			)
		)
	)
)

(enum_declaration name:
	(identifier) @enum_name
) @enum

(struct_declaration
	(identifier) @struct_name
) @struct

(namespace_declaration
	[
		name: (identifier) @module_name
		name: (qualified_name) @module_name
	]
) @module

(enum_member_declaration
	(identifier) @enumMember_name
) @enumMember`;
