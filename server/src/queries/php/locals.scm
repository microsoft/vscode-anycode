(assignment_expression
	left: (variable_name) @local)
(augmented_assignment_expression
	left: (variable_name) @local)
(static_variable_declaration
	name: (variable_name) @local)
(simple_parameter
	name: (variable_name) @local)

(method_declaration parameters: _) @scope
(method_declaration body: _) @scope.merge
(function_definition parameters: _) @scope
(function_definition body: _) @scope.merge
(compound_statement) @scope

(variable_name) @usage
