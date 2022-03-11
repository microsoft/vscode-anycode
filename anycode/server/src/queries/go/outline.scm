
(field_declaration (field_identifier) @field @field.name)

(method_spec
	name: (field_identifier) @method.name
) @method

(type_alias
	name: (type_identifier) @string.name
) @string

(function_declaration
	name: (identifier) @function.name
) @function

(method_declaration
	name: (field_identifier) @method.name
) @method

;; variables defined in the package
(source_file
	(var_declaration
		(var_spec
			(identifier) @variable.name
		) @variable
	)
)

;; lots of type_spec, must be mutually exclusive
(type_spec 
	name: (type_identifier) @interface.name
	type: (interface_type)
) @interface

(type_spec 
	name: (type_identifier) @function.name
	type: (function_type)
) @function

(type_spec
	name: (type_identifier) @struct.name
	type: (struct_type)
) @struct

(type_spec
	name: (type_identifier) @struct.name
	type: (map_type)
) @struct

(type_spec
	name: (type_identifier) @struct.name
	type: (pointer_type)
) @struct

(type_spec
	name: (type_identifier) @event.name
	type: (channel_type)
) @event

(type_spec 
	name: (type_identifier) @class.name
	type: (type_identifier)
) @class
