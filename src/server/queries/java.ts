/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from "../queries";

const documentSymbols =`
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
`;

const definitions = `

${documentSymbols}

(formal_parameter name: (identifier) @symbol.variable.name) @symbol.variable
(local_variable_declaration declarator: (variable_declarator name: (identifier) @symbol.variable.name)) @symbol.variable
(catch_formal_parameter name: (identifier) @symbol.variable.name) @symbol.variable
`;

const usages = `
(argument_list (identifier) @usage) ;; foo(USAGE)
(method_invocation object: (identifier) @usage) ;; USAGE(foo)
(field_access object: (identifier) @usage) ;; USAGE.foo
(assignment_expression right: (identifier) @usage) ;; foo = USAGE
(binary_expression (identifier) @usage)

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
	type: (type_identifier) @usage.type
)

(local_variable_declaration
	type: (type_identifier) @usage.type
)

(type_arguments
	(type_identifier) @usage.type
)

(wildcard
	(type_identifier) @usage.type
)
`;

const scopes = `
[(class_declaration) (interface_declaration) (enum_declaration) (method_declaration)] @scope
(for_statement) @scope
(if_statement consequence: (_) @scope)
(if_statement alternative: (_) @scope)
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
	documentSymbols,
	definitions,
	usages,
	scopes,
	comments,
	folding
};

export default mod;
