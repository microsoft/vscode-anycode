/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export = `(class_declaration
	name: (name) @class.name
) @class

(method_declaration
  name: (name) @method.name
) @method

(property_element
	(variable.name) @property.name
) @property

(function_definition
	name: (name) @function.name
) @function

(trait_declaration
	name: (name) @property.name
) @property`;
