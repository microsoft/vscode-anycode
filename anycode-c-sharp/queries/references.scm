(object_creation_expression
	type: (identifier) @ref.type)
(type_parameter
	name: (identifier) @ref.type)
(variable_declaration
	type: (identifier) @ref.type)
(member_access_expression 
	name: (identifier) @ref)
(invocation_expression
	function: (identifier) @ref)
(base_list (_) @ref.type)
