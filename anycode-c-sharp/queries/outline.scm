
(class_declaration
	name: (identifier) @class.name
) @class

(interface_declaration 
	name: (identifier) @interface.name
) @interface

(record_declaration 
	name: (identifier) @record.name
) @record

(record_declaration
	(parameter_list
		(parameter
			name: (identifier) @property.name
		) @property
	)
)

(constructor_declaration
	name: (identifier) @constructor.name
) @constructor

(destructor_declaration
	(identifier) @method.name
) @method

(indexer_declaration
	(bracketed_parameter_list) @method.name
) @method

(method_declaration
	name: (identifier) @method.name
) @method

(property_declaration
	name: (identifier) @property.name
) @property

(delegate_declaration
	name: (identifier) @function.name
) @function

(field_declaration
	(variable_declaration
		(variable_declarator
			(identifier) @field.name
		)
	)
) @field

(event_field_declaration
	(variable_declaration
		(variable_declarator
			(identifier) @event.name
		)
	)
) @event

(attribute_list
	(attribute
		(identifier) @constant.name
	) @constant
)

(global_statement
	(local_declaration_statement
		(variable_declaration
			(variable_declarator
				(identifier) @variable.name
			)
		)
	)
)

(enum_declaration name:
	(identifier) @enum.name
) @enum

(struct_declaration
	(identifier) @struct.name
) @struct

(namespace_declaration
	[
		name: (identifier) @module.name
		name: (qualified_name) @module.name
	]
) @module

(enum_member_declaration
	(identifier) @enumMember.name
) @enumMember
