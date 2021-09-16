(class_declaration
	name: (name) @definition.class.name
) @definition.class

(method_declaration
  name: (name) @definition.method.name
) @definition.method

(property_element
	(variable_name) @definition.property.name
) @definition.property

(function_definition
	name: (name) @definition.function.name
) @definition.function

(trait_declaration
	name: (name) @definition.property.name
) @definition.property
