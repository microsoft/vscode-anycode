(mod_item
	name: (identifier) @module.name) @module

(function_item
	name: (identifier) @function.name) @function

(union_item
	name: (type_identifier) @struct.name) @struct

(field_declaration
	name: (field_identifier) @field.name) @field

(struct_item
	name: (type_identifier) @struct.name) @struct

(enum_item
	name: (type_identifier) @enum.name) @enum

(enum_variant
	name: (identifier) @enumMember.name) @enumMember

(trait_item
	name: (type_identifier) @interface.name) @interface

(function_signature_item
	name: (identifier) @function.name) @function

(const_item
	name: (identifier) @constant.name) @constant

(static_item
	name: (identifier) @constant.name) @constant

(type_item
	name: (type_identifier) @interface.name) @interface

(impl_item 
	. (type_identifier) @class.name) @class

(foreign_mod_item
	(extern_modifier (string_literal) @namespace.name)) @namespace
