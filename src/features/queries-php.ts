/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export = `(class_declaration
	name: (name) @class_name
) @class

(method_declaration
  name: (name) @method_name
) @method

(property_element
	(variable_name) @property_name
) @property

(function_definition
	name: (name) @function_name
) @function

(trait_declaration
	name: (name) @property_name
) @property`;
