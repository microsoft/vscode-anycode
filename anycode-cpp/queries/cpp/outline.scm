;; START copy of c/outline.scm 

(struct_specifier
	name: (type_identifier) @struct.name) @struct

(union_specifier
	name: (type_identifier) @struct.name) @struct

(enum_specifier
	name: (type_identifier) @enum.name) @enum

(enumerator
	name: (identifier) @enumMember.name) @enumMember

(function_definition
	declarator: (function_declarator
		[
			(identifier) @function.name
			(field_identifier) @function.name
		])) @function

(pointer_declarator
	declarator: (function_declarator
		declarator: (identifier) @function.name) @function)

(declaration
	declarator: (function_declarator
		[
			(identifier) @function.name
			(field_identifier) @function.name
		]) @function)

(declaration
	type: (primitive_type) 
	declarator: (identifier) @variable.name) @variable

(type_definition
	type: (_)
	declarator: (type_identifier) @struct.name) @struct

(linkage_specification
	value: (string_literal) @struct.name) @struct

(field_declaration
	(function_declarator
		[
			(identifier) @function.name
			(field_identifier) @function.name
		]
	)) @function


(field_declaration
	(field_identifier) @field.name) @field

(field_declaration_list
	(field_declaration
		[
			declarator: (field_identifier) @field.name
			(array_declarator
				declarator: (field_identifier) @field.name
			)
		]
	) @field)

;; END copy of c/outline.scm

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
