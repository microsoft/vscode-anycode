
(mod_item
	name: (identifier) @definition.module.name
) @definition.module

(function_item
	name: (identifier) @definition.function.name
) @definition.function

(union_item
	name: (type_identifier) @definition.struct.name
) @definition.struct

(field_declaration
	name: (field_identifier) @definition.field.name
) @definition.field

(struct_item
	name: (type_identifier) @definition.struct.name
) @definition.struct

(enum_item
	name: (type_identifier) @definition.enum.name
) @definition.enum

(enum_variant
	name: (identifier) @definition.enumMember.name
) @definition.enumMember

(trait_item
	name: (type_identifier) @definition.interface.name
) @definition.interface

(function_signature_item
	name: (identifier) @definition.function.name
) @definition.function

(const_item
	name: (identifier) @definition.constant.name
) @definition.constant

(static_item
	name: (identifier) @definition.constant.name
) @definition.constant

(type_item
	name: (type_identifier) @definition.interface.name
) @definition.interface

(impl_item type: (type_identifier) @definition.class.name) @definition.class
(impl_item trait: (type_identifier) @definition.class.name) @definition.class

(foreign_mod_item
	[
		(extern_modifier (string_literal) @definition.namespace.name)
		(extern_modifier) @definition.namespace.name
	]
) @definition.namespace
