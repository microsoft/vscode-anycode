(class_declaration
	("class")
	(type_identifier) @class.name
) @class

(class_declaration
	("interface")
	(type_identifier) @interface.name
) @interface

(object_declaration
	(type_identifier) @class.name
) @class

(class_declaration
	("enum")
	(type_identifier) @enum.name
)


(companion_object (("companion")  @class.name ("object") (type_identifier)?)) @class
(object_literal ("object") @class.name) @class


(enum_entry (simple_identifier) @enumMember.name) @enumMember
(secondary_constructor ("constructor") @constructor.name) @constructor
(anonymous_initializer ("init") @function.name) @function
(primary_constructor (class_parameter (("val") (simple_identifier) @property.name)))
(primary_constructor (class_parameter (("var") (simple_identifier) @property.name)))
(class_body (property_declaration (variable_declaration (simple_identifier) @property.name)))

(source_file (property_declaration (variable_declaration(simple_identifier)@property.name)))
(function_declaration(simple_identifier) @function.name) @function
