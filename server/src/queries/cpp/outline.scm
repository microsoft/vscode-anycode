(namespace_definition
	name: (identifier) @definition.module.name) @definition.module

(friend_declaration
	(type_identifier) @definition.variable.name) @definition.variable

(field_declaration
	(function_declarator
		(scoped_identifier) @definition.function.name)) @definition.function

(declaration
	(function_declarator
		[
			(scoped_identifier) @definition.function.name
			(destructor_name) @definition.function.name
		]) @definition.function)

(class_specifier
	(type_identifier) @definition.class.name) @definition.class
