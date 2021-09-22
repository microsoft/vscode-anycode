
(parameter name: (identifier) @local)
(variable_declarator (identifier) @local)
(for_each_statement left: (identifier) @local)
(query_expression [
	(from_clause . (identifier) @local) 
])

(member_access_expression name: (identifier) @usage.void)
(identifier) @usage

(constructor_declaration parameters: (parameter_list) @scope) 
(constructor_declaration body: (_) @scope.merge) 
(method_declaration parameters: (parameter_list) @scope) 
(method_declaration body: (_) @scope.merge)
(if_statement [consequence: (_) @scope alternative: (_) @scope]) 
(for_each_statement) @scope
(for_statement) @scope
(do_statement) @scope
(while_statement) @scope
(using_statement) @scope
(block) @scope
