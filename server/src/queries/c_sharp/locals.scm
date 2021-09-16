
(parameter name: (identifier) @definition)
(variable_declarator (identifier) @definition)
(for_each_statement left: (identifier) @definition)
(query_expression [
	(from_clause . (identifier) @definition) 
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
