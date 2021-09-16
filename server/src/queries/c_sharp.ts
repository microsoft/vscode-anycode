/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const outline = `
(class_declaration
	name: (identifier) @definition.class.name
) @definition.class

(interface_declaration 
	name: (identifier) @definition.interface.name
) @definition.interface

(record_declaration 
	name: (identifier) @definition.record.name
) @definition.record

(record_declaration
	(parameter_list
		(parameter
			name: (identifier) @definition.property.name
		) @definition.property
	)
)

(constructor_declaration
	name: (identifier) @definition.constructor.name
) @definition.constructor

(destructor_declaration
	(identifier) @definition.method.name
) @definition.method

(indexer_declaration
	(bracketed_parameter_list) @definition.method.name
) @definition.method

(method_declaration
	name: (identifier) @definition.method.name
) @definition.method

(property_declaration
	name: (identifier) @definition.property.name
) @definition.property

(delegate_declaration
	name: (identifier) @definition.function.name
) @definition.function

(field_declaration
	(variable_declaration
		(variable_declarator
			(identifier) @definition.field.name
		)
	)
) @definition.field

(event_field_declaration
	(variable_declaration
		(variable_declarator
			(identifier) @definition.event.name
		)
	)
) @definition.event

(global_attribute_list
	(attribute
		(identifier) @definition.constant.name
	) @definition.constant
)

(global_statement
	(local_declaration_statement
		(variable_declaration
			(variable_declarator
				(identifier) @definition.variable.name
			)
		)
	)
)

(enum_declaration name:
	(identifier) @definition.enum.name
) @definition.enum

(struct_declaration
	(identifier) @definition.struct.name
) @definition.struct

(namespace_declaration
	[
		name: (identifier) @definition.module.name
		name: (qualified_name) @definition.module.name
	]
) @definition.module

(enum_member_declaration
	(identifier) @definition.enumMember.name
) @definition.enumMember`;

const locals = `
(parameter name: (identifier) @definition)
(variable_declarator (identifier) @definition)
(for_each_statement left: (identifier) @definition)
(query_expression [
	(from_clause . (identifier) @definition) 
])

(member_access_expression name: (identifier) @usage.void)
(identifier) @usage

(constructor_declaration parameters: (parameter_list) @scope) 
(constructor_declaration body: (_) @scope.merge) 
(method_declaration parameters: (parameter_list) @scope) 
(method_declaration body: (_) @scope.merge)
(if_statement [consequence: (_) @scope alternative: (_) @scope]) 
(for_each_statement) @scope
(for_statement) @scope
(do_statement) @scope
(while_statement) @scope
(using_statement) @scope
(block) @scope
`;

const comments = `(comment) @comment`;

export const mod: QueryModule = {
	outline,
	locals,
	comments
};

export default mod;
