
(class_declaration
	name: (identifier) @definition.class.name
) @definition.class

(variable_declarator
	name: (identifier) @definition.class.name
	value: (object_creation_expression
		.
		(_)*
		(class_body)
	)
) @definition.class

(interface_declaration
	name: (identifier) @definition.interface.name
) @definition.interface

(enum_declaration
	name: (identifier) @definition.enum.name
) @definition.enum

(enum_constant
	name: (identifier) @definition.enumMember.name
) @definition.enumMember

(constructor_declaration
	name: (identifier) @definition.constructor.name
) @definition.constructor

(method_declaration
	name: (identifier) @definition.method.name
) @definition.method

(field_declaration
	declarator: ((variable_declarator
		name: (identifier) @definition.field.name)
	) @definition.field
)

(module_declaration
	[
		(scoped_identifier) @definition.module.name
		(identifier) @definition.module.name
	]
) @definition.module
