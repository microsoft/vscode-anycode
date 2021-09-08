/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const documentSymbols = `
(class_declaration
	name: (identifier) @symbol.class.name
) @symbol.class

(interface_declaration 
	name: (identifier) @symbol.interface.name
) @symbol.interface

(record_declaration 
	name: (identifier) @symbol.record.name
) @symbol.record

(record_declaration
	(parameter_list
		(parameter
			name: (identifier) @symbol.property.name
		) @symbol.property
	)
)

(constructor_declaration
	name: (identifier) @symbol.constructor.name
) @symbol.constructor

(destructor_declaration
	(identifier) @symbol.method.name
) @symbol.method

(indexer_declaration
	(bracketed_parameter_list) @symbol.method.name
) @symbol.method

(method_declaration
	name: (identifier) @symbol.method.name
) @symbol.method

(property_declaration
	name: (identifier) @symbol.property.name
) @symbol.property

(delegate_declaration
	name: (identifier) @symbol.function.name
) @symbol.function

(field_declaration
	(variable_declaration
		(variable_declarator
			(identifier) @symbol.field.name
		)
	)
) @symbol.field

(event_field_declaration
	(variable_declaration
		(variable_declarator
			(identifier) @symbol.event.name
		)
	)
) @symbol.event

(global_attribute_list
	(attribute
		(identifier) @symbol.constant.name
	) @symbol.constant
)

(global_statement
	(local_declaration_statement
		(variable_declaration
			(variable_declarator
				(identifier) @symbol.variable.name
			)
		)
	)
)

(enum_declaration name:
	(identifier) @symbol.enum.name
) @symbol.enum

(struct_declaration
	(identifier) @symbol.struct.name
) @symbol.struct

(namespace_declaration
	[
		name: (identifier) @symbol.module.name
		name: (qualified_name) @symbol.module.name
	]
) @symbol.module

(enum_member_declaration
	(identifier) @symbol.enumMember.name
) @symbol.enumMember`;

export const mod: QueryModule = {
	documentSymbols
};

export default mod;
