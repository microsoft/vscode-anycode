/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { QueryModule } from "../queries";

const documentSymbols = `
(struct_specifier
	name: (type_identifier) @symbol.struct.name
) @symbol.struct

(union_specifier
	name: (type_identifier) @symbol.struct.name
) @symbol.struct

(enum_specifier
	name: (type_identifier) @symbol.enum.name
) @symbol.enum

(enumerator
	name: (identifier) @symbol.enumMember.name
) @symbol.enumMember

(function_definition
	declarator: (function_declarator
		declarator: (identifier) @symbol.function.name
	)
) @symbol.function

(pointer_declarator
	declarator: (function_declarator
		declarator: (identifier) @symbol.function.name
	) @symbol.function
)

(declaration
	declarator: (function_declarator
		declarator: (identifier) @symbol.function.name
	) @symbol.function
)

(type_definition
	type: (_)
	declarator: (type_identifier) @symbol.struct.name
) @symbol.struct

(linkage_specification
	value: (string_literal) @symbol.struct.name
) @symbol.struct

(field_declaration_list
	(field_declaration
		[
			declarator: (field_identifier) @symbol.field.name
			(array_declarator
				declarator: (field_identifier) @symbol.field.name
			)
		]
	) @symbol.field
)`;


export const mod: QueryModule = {
	documentSymbols
};

export default mod;
