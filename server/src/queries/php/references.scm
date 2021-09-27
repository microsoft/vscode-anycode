(object_creation_expression [
	(qualified_name (name) @ref)
	(variable_name (name) @ref)])

(function_call_expression function: [
	(qualified_name (name) @ref)
	(variable_name (name)) @ref])

(member_access_expression name: (name) @ref) 

(scoped_call_expression
	name: (name) @ref)

(member_call_expression
	name: (name) @ref)
