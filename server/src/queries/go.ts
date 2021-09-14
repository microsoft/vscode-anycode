/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const definitionsOutline = `
(field_declaration (field_identifier) @definition.field @definition.field.name)

(method_spec
	name: (field_identifier) @definition.method.name
) @definition.method

(type_alias
	name: (type_identifier) @definition.string.name
) @definition.string

(function_declaration
	name: (identifier) @definition.function.name
) @definition.function

(method_declaration
	name: (field_identifier) @definition.method.name
) @definition.method

;; variables defined in the package
(source_file
	(var_declaration
		(var_spec
			(identifier) @definition.variable.name
		) @definition.variable
	)
)

;; lots of type_spec, must be mutually exclusive
(type_spec 
	name: (type_identifier) @definition.interface.name
	type: (interface_type)
) @definition.interface

(type_spec 
	name: (type_identifier) @definition.function.name
	type: (function_type)
) @definition.function

(type_spec
	name: (type_identifier) @definition.struct.name
	type: (struct_type)
) @definition.struct

(type_spec
	name: (type_identifier) @definition.struct.name
	type: (map_type)
) @definition.struct

(type_spec
	name: (type_identifier) @definition.struct.name
	type: (pointer_type)
) @definition.struct

(type_spec
	name: (type_identifier) @definition.event.name
	type: (channel_type)
) @definition.event
`;

const definitionsAll = `
${definitionsOutline}
(const_spec name: (identifier) @definition.variable.name) @definition.variable
(var_declaration (var_spec (identifier) @definition.variable.name @definition.variable))
(parameter_declaration (identifier) @definition.variable.name @definition.variable)
(short_var_declaration left: (expression_list (identifier) @definition.variable.name)) @definition.variable
(range_clause left: (expression_list (identifier) @definition.variable.name)) @definition.variable
(type_switch_statement (expression_list (identifier) @definition.variable @definition.variable.name))
`;

const usages = `
(identifier) @usage.variable
`;


const scopes = `
(method_declaration parameters: (parameter_list) @scope)
(method_declaration body: (block) @scope.merge)
(function_declaration parameters: (parameter_list) @scope)
(function_declaration body: (block) @scope.merge)
(expression_switch_statement) @scope
(for_statement) @scope
(block) @scope
(type_switch_statement) @scope
`;


const comments = `
(comment) @comment
`;

const folding = `
${scopes}
${comments}
`;

export const mod: QueryModule = {
	definitionsOutline,
	definitionsAll,
	comments,
	usages,
	scopes,
	folding
};

export default mod;
