(method_definition) @scope
(function_declaration) @scope
(function_expression) @scope
(arrow_function) @scope
[(class_body) (enum_body)] @scope
(interface_declaration body: (interface_body) @scope)
(for_statement) @scope
(if_statement consequence: (_) @scope)
(if_statement alternative: (_) @scope)
(while_statement body: (_) @scope)
(try_statement (statement_block) @scope)
(catch_clause) @scope
(statement_block) @scope

(function_declaration name: (identifier) @local.escape)
(function_expression name: (identifier) @local.escape)
(required_parameter (identifier) @local)
(optional_parameter (identifier) @local)
(catch_clause parameter: (identifier) @local)
(variable_declarator (identifier) @local)
(type_parameter (type_identifier) @local)

(enum_declaration name: (identifier) @usage.void)
(identifier) @usage
(type_identifier) @usage
