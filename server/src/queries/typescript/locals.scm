(required_parameter) @local
(optional_parameter) @local
(catch_clause parameter: (identifier) @local)
(variable_declarator (identifier) @local)

(enum_declaration name: (identifier) @usage.void)
(identifier) @usage

(method_definition (formal_parameters) @scope)
(method_definition (statement_block) @scope.merge) 
(function_declaration (formal_parameters) @scope)
(function_declaration (statement_block) @scope.merge)
(function (formal_parameters) @scope)
(function (statement_block) @scope.merge)
(arrow_function (formal_parameters) @scope)
(arrow_function (statement_block) @scope.merge)
[(class_body) (enum_body)] @scope
(interface_declaration body: (object_type) @scope)
(for_statement) @scope
(if_statement consequence: (_) @scope)
(if_statement alternative: (_) @scope)
(while_statement body: (_) @scope)
(try_statement (statement_block) @scope)
(catch_clause) @scope
(statement_block) @scope
