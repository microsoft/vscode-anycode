(class_declaration
	name: (name) @class.name
) @class

(method_declaration
  name: (name) @method.name
) @method

(property_element
	(variable_name) @property.name
) @property

(function_definition
	name: (name) @function.name
) @function

(trait_declaration
	name: (name) @property.name
) @property
