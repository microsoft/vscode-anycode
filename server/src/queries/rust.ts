/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const definitionsOutline = `
(mod_item
	name: (identifier) @definition.module.name
) @definition.module

(function_item
	name: (identifier) @definition.function.name
) @definition.function

(union_item
	name: (type_identifier) @definition.struct.name
) @definition.struct

(field_declaration
	name: (field_identifier) @definition.field.name
) @definition.field

(struct_item
	name: (type_identifier) @definition.struct.name
) @definition.struct

(enum_item
	name: (type_identifier) @definition.enum.name
) @definition.enum

(enum_variant
	name: (identifier) @definition.enumMember.name
) @definition.enumMember

(trait_item
	name: (type_identifier) @definition.interface.name
) @definition.interface

(function_signature_item
	name: (identifier) @definition.function.name
) @definition.function

(const_item
	name: (identifier) @definition.constant.name
) @definition.constant

(static_item
	name: (identifier) @definition.constant.name
) @definition.constant

(type_item
	name: (type_identifier) @definition.interface.name
) @definition.interface

(impl_item type: (type_identifier) @definition.class.name) @definition.class
(impl_item trait: (type_identifier) @definition.class.name) @definition.class

(foreign_mod_item
	[
		(extern_modifier (string_literal) @definition.namespace.name)
		(extern_modifier) @definition.namespace.name
	]
) @definition.namespace
`;

const definitionsAll = `
${definitionsOutline}
(let_declaration pattern: (identifier) @definition.variable.name) @definition.variable
(parameter pattern: (identifier) @definition.variable.name) @definition.variable
(for_expression pattern: [(identifier) @definition.variable.name @definition.variable (reference_pattern (identifier) @definition.variable.name @definition.variable)] )
`;

const usages = `
(parameter pattern: [(identifier) @usage.variable])
(token_tree (identifier) @usage.variable)
(macro_invocation macro: (identifier) @usage.variable)
(call_expression function: (identifier) @usage.variable)
(arguments (identifier) @usage.variable)
(reference_expression value: (identifier) @usage.variable)
(index_expression (identifier) @usage.variable)
(field_expression (identifier) @usage.variable)
(for_expression value: (identifier) @usage.variable)
(binary_expression (identifier) @usage.variable)
(assignment_expression (identifier) @usage.variable)
(block (identifier) @usage.variable)
(field_initializer (identifier) @usage.variable)
`;

const scopes = `
(function_item (parameters) @scope)
(function_item (block) @scope.merge)
(for_expression) @scope
(block) @scope
`;

const comments = `
(line_comment) @comment
(block_comment) @comment
`;

const folding = `
${comments}
${scopes}
(_) body: (_) @fold
`;

export const mod: QueryModule = {
	definitionsOutline,
	definitionsAll,
	usages,
	scopes,
	comments,
	folding
};

export default mod;
