/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const documentSymbols = `
(field_declaration
	name: (field_identifier) @symbol.field.name
) @symbol.field

(method_spec
	name: (field_identifier) @symbol.method.name
) @symbol.method

(type_alias
	name: (type_identifier) @symbol.string.name
) @symbol.string

(function_declaration
	name: (identifier) @symbol.function.name
) @symbol.function

(method_declaration
	name: (field_identifier) @symbol.method.name
) @symbol.method

;; variables defined in the package
(source_file
	(var_declaration
		(var_spec
			name: (identifier) @symbol.variable.name
		) @symbol.variable
	)
)

;; lots of type_spec, must be mutually exclusive
(type_spec 
	name: (type_identifier) @symbol.interface.name
	type: (interface_type)
) @symbol.interface

(type_spec 
	name: (type_identifier) @symbol.function.name
	type: (function_type)
) @symbol.function

(type_spec 
	name: (type_identifier) @symbol.struct.name
	type: (struct_type)
) @symbol.struct

(type_spec
	name: (type_identifier) @symbol.struct.name
	type: (map_type)
) @symbol.struct

(type_spec
	name: (type_identifier) @symbol.struct.name
	type: (pointer_type)
) @symbol.struct

(type_spec
	name: (type_identifier) @symbol.event.name
	type: (channel_type)
) @symbol.event
`;

const definitions = `

${documentSymbols}

(parameter_declaration name: (identifier) @symbol.variable.name) @symbol.variable
(short_var_declaration left: (expression_list (identifier) @symbol.variable.name)) @symbol.variable
`;

const usages = `
(field_identifier) @usage
(identifier) @usage
(type_identifier) @usage
`;


const scopes = `
(function_declaration parameters: (parameter_list) @scope)
(function_declaration body: (block) @scope.merge)
(expression_switch_statement) @scope
(for_statement) @scope
(block) @scope
`;


const comments = `
(comment) @comment
`;

const folding = `
${scopes}
${comments}
`;

export const mod: QueryModule = {
	documentSymbols,
	definitions,
	comments,
	usages,
	scopes,
	folding
};

export default mod;
