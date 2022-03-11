(method_declaration) @scope
(function_definition) @scope
(compound_statement) @scope
(declaration_list) @scope

(function_definition
	name: (name) @local.escape)
(method_declaration
	name: (name) @local.escape)
(assignment_expression
	left: (variable_name) @local)
(augmented_assignment_expression
	left: (variable_name) @local)
(static_variable_declaration
	name: (variable_name) @local)
(simple_parameter
	name: (variable_name) @local)

(variable_name) @usage
