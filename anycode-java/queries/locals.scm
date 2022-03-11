
(method_declaration) @scope
(constructor_declaration) @scope
[(class_body) (interface_body) (enum_body)] @scope
(for_statement) @scope
(if_statement consequence: (_) @scope)
(if_statement alternative: (_) @scope)
(while_statement body: (_) @scope)
(try_statement (block) @scope)
(catch_clause) @scope
(block) @scope

(formal_parameter name: (identifier) @local)
(local_variable_declaration declarator: (variable_declarator name: (identifier) @local))
(catch_formal_parameter name: (identifier) @local)
(method_declaration name: (identifier) @local.escape)
(constructor_declaration name: (identifier) @local.escape)

(field_access field: (identifier) @usage.void)
(identifier) @usage
