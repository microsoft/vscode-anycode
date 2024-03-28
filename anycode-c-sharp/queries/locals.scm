(namespace_declaration body: (_) @scope.exports)
(class_declaration) @scope
(interface_declaration) @scope
(constructor_declaration) @scope
(method_declaration) @scope
(if_statement [consequence: (_) @scope alternative: (_) @scope]) 
(for_each_statement) @scope
(for_statement) @scope
(do_statement) @scope
(while_statement) @scope
(using_statement) @scope
(block) @scope

(class_declaration name: (identifier) @local.escape)
(interface_declaration name: (identifier) @local.escape)
(constructor_declaration name: (identifier) @local.escape)
(method_declaration name: (identifier) @local.escape)
(parameter name: (identifier) @local)
(variable_declarator (identifier) @local)
(type_parameter (identifier) @local)
(for_each_statement left: (identifier) @local)
(query_expression [
	(from_clause . (identifier) @local) 
])

(member_access_expression name: (identifier) @usage.void)
(identifier) @usage
