/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from '../queries';

const definitionsOutline = `
(struct_specifier
	name: (type_identifier) @definition.struct.name
) @definition.struct

(union_specifier
	name: (type_identifier) @definition.struct.name
) @definition.struct

(enum_specifier
	name: (type_identifier) @definition.enum.name
) @definition.enum

(enumerator
	name: (identifier) @definition.enumMember.name
) @definition.enumMember

(function_definition
	declarator: (function_declarator
		declarator: (identifier) @definition.function.name
	)
) @definition.function

(pointer_declarator
	declarator: (function_declarator
		declarator: (identifier) @definition.function.name
	) @definition.function
)

(declaration
	declarator: (function_declarator
		declarator: (identifier) @definition.function.name
	) @definition.function
)

(type_definition
	type: (_)
	declarator: (type_identifier) @definition.struct.name
) @definition.struct

(linkage_specification
	value: (string_literal) @definition.struct.name
) @definition.struct

(field_declaration_list
	(field_declaration
		[
			declarator: (field_identifier) @definition.field.name
			(array_declarator
				declarator: (field_identifier) @definition.field.name
			)
		]
	) @definition.field
)`;

const comments = `
(comment) @comment
`;

export const mod: QueryModule = {
	definitionsOutline,
	comments
};

export default mod;
