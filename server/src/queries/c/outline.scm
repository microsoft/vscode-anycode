(struct_specifier
	name: (type_identifier) @definition.struct.name) @definition.struct

(union_specifier
	name: (type_identifier) @definition.struct.name) @definition.struct

(enum_specifier
	name: (type_identifier) @definition.enum.name) @definition.enum

(enumerator
	name: (identifier) @definition.enumMember.name) @definition.enumMember

(function_definition
	declarator: (function_declarator
		(field_identifier) @definition.function.name)) @definition.function

(pointer_declarator
	declarator: (function_declarator
		declarator: (identifier) @definition.function.name) @definition.function)

(declaration
	declarator: (function_declarator
		[
			(identifier) @definition.function.name
			(field_identifier) @definition.function.name
		]) @definition.function)

(declaration
	type: (primitive_type) 
	declarator: (identifier) @definition.variable.name) @definition.variable

(type_definition
	type: (_)
	declarator: (type_identifier) @definition.struct.name) @definition.struct

(linkage_specification
	value: (string_literal) @definition.struct.name) @definition.struct

(field_declaration
	(function_declarator
		[
			(identifier) @definition.function.name
			(field_identifier) @definition.function.name
		]
	)) @definition.function


(field_declaration
	(field_identifier) @definition.field.name) @definition.field

(field_declaration_list
	(field_declaration
		[
			declarator: (field_identifier) @definition.field.name
			(array_declarator
				declarator: (field_identifier) @definition.field.name
			)
		]
	) @definition.field)
