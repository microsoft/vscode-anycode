/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const definitionsOutline = `
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

const definitionsAll = `

${definitionsOutline}

(formal_parameter name: (identifier) @definition.variable.name) @definition.variable
(local_variable_declaration declarator: (variable_declarator name: (identifier) @definition.variable.name)) @definition.variable
(catch_formal_parameter name: (identifier) @definition.variable.name) @definition.variable
`;

const usages = `
(identifier) @usage
(type_identifier) @usage
`;

const scopes = `
[(class_body) (interface_body) (enum_body)] @scope
(method_declaration (formal_parameters) @scope)
(method_declaration (block) @scope.merge)
(for_statement) @scope
(if_statement consequence: (_) @scope)
(if_statement alternative: (_) @scope)
(while_statement body: (_) @scope)
(try_statement (block) @scope)
(catch_clause) @scope
(block) @scope
`;

const comments = `
(comment) @comment
`;

const folding = `
${scopes}
${comments}
(
	(import_declaration)
	(import_declaration)*
) @import`;

export const mod: QueryModule = {
	definitionsOutline,
	definitionsAll,
	usages,
	scopes,
	comments,
	folding
};

export default mod;
