(type_identifier) @ref.class.interface.enum
(new_expression
	constructor: (identifier) @ref.class)
(call_expression [
	(identifier) @ref.function
 	(member_expression property: (property_identifier) @ref.function)])
(property_identifier) @ref.field.method
(import_specifier 
	name: (identifier) @ref.import)
