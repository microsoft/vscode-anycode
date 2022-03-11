(namespace_definition
	name: (identifier) @module.name) @module

(friend_declaration
	(type_identifier) @variable.name) @variable

(field_declaration
	(function_declarator
		(scoped_identifier) @function.name)) @function

(declaration
	(function_declarator
		[
			(scoped_identifier) @function.name
			(destructor_name) @function.name
		]) @function)

(class_specifier
	(type_identifier) @class.name) @class
