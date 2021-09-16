/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const outline = `
(class_declaration
	name: (identifier) @definition.class.name
) @definition.class

(variable_declarator
	name: (identifier) @definition.class.name
	value: (object_creation_expression
		.
		(_)*
		(class_body)
	)
) @definition.class

(interface_declaration
	name: (identifier) @definition.interface.name
) @definition.interface

(enum_declaration
	name: (identifier) @definition.enum.name
) @definition.enum

(enum_constant
	name: (identifier) @definition.enumMember.name
) @definition.enumMember

(constructor_declaration
	name: (identifier) @definition.constructor.name
) @definition.constructor

(method_declaration
	name: (identifier) @definition.method.name
) @definition.method

(field_declaration
	declarator: ((variable_declarator
		name: (identifier) @definition.field.name)
	) @definition.field
)

(module_declaration
	[
		(scoped_identifier) @definition.module.name
		(identifier) @definition.module.name
	]
) @definition.module
`;

const scopes = `
[(class_body) (interface_body) (enum_body)] @scope
(for_statement) @scope
(if_statement consequence: (_) @scope)
(if_statement alternative: (_) @scope)
(while_statement body: (_) @scope)
(try_statement (block) @scope)
(catch_clause) @scope
(block) @scope
`;

const locals = `
(formal_parameter name: (identifier) @definition)
(local_variable_declaration declarator: (variable_declarator name: (identifier) @definition))
(catch_formal_parameter name: (identifier) @definition)

(field_access field: (identifier) @usage.void)
(identifier) @usage

(method_declaration (formal_parameters) @scope)
(method_declaration (block) @scope.merge)
(constructor_declaration (formal_parameters) @scope)
(constructor_declaration (constructor_body) @scope.merge)
${scopes}
`;


const comments = `
(comment) @comment
`;

const folding = `
${scopes}
${comments}
`;

const identifiers = `
(type_identifier) @identifier
(identifier) @identifier
`;

export const mod: QueryModule = {
	identifiers,
	outline,
	comments,
	folding,
	locals
};

export default mod;
