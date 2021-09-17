
(field_declaration (field_identifier) @definition.field @definition.field.name)

(method_spec
	name: (field_identifier) @definition.method.name
) @definition.method

(type_alias
	name: (type_identifier) @definition.string.name
) @definition.string

(function_declaration
	name: (identifier) @definition.function.name
) @definition.function

(method_declaration
	name: (field_identifier) @definition.method.name
) @definition.method

;; variables defined in the package
(source_file
	(var_declaration
		(var_spec
			(identifier) @definition.variable.name
		) @definition.variable
	)
)

;; lots of type_spec, must be mutually exclusive
(type_spec 
	name: (type_identifier) @definition.interface.name
	type: (interface_type)
) @definition.interface

(type_spec 
	name: (type_identifier) @definition.function.name
	type: (function_type)
) @definition.function

(type_spec
	name: (type_identifier) @definition.struct.name
	type: (struct_type)
) @definition.struct

(type_spec
	name: (type_identifier) @definition.struct.name
	type: (map_type)
) @definition.struct

(type_spec
	name: (type_identifier) @definition.struct.name
	type: (pointer_type)
) @definition.struct

(type_spec
	name: (type_identifier) @definition.event.name
	type: (channel_type)
) @definition.event

(type_spec 
	name: (type_identifier) @definition.class.name
	type: (type_identifier)
) @definition.class
