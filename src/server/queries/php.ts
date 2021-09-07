/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const queries =`(class_declaration
	name: (name) @symbol.class.name
) @symbol.class

(method_declaration
  name: (name) @symbol.method.name
) @symbol.method

(property_element
	(variable_name) @symbol.property.name
) @symbol.property

(function_definition
	name: (name) @symbol.function.name
) @symbol.function

(trait_declaration
	name: (name) @symbol.property.name
) @symbol.property`;
