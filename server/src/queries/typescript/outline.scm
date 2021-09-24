(interface_declaration
	name: (type_identifier) @interface.name) @interface

(property_signature
	name: (property_identifier) @field.name) @field

(method_signature
	name: (property_identifier) @method.name) @method

(class_declaration
	name: (type_identifier) @class.name) @class

(new_expression
	constructor: (class
		body: (class_body)) @class)

(method_definition
	name: [
		(property_identifier) @method.name
		(computed_property_name (string) @method.name)
	]) @method

(public_field_definition
	name: [
		(property_identifier) @field.name
		(computed_property_name (string) @field.name)
	]) @field

(enum_declaration
	name: (identifier) @enum.name) @enum

(enum_body [
	(property_identifier) @enumMember
	(enum_assignment (property_identifier) @enumMember)])

(function_declaration
	name: (identifier) @function.name) @function

(function_signature
	name: (identifier) @function.name) @function

(variable_declarator
	name: (identifier) @variable.name) @variable

(module
	name: [(identifier)@module.name (string) @module.name]) @module

(internal_module
	name: (identifier) @module.name) @module

(type_alias_declaration
	name: (type_identifier) @interface.name) @interface
