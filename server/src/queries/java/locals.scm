(formal_parameter name: (identifier) @local)
(local_variable_declaration declarator: (variable_declarator name: (identifier) @local))
(catch_formal_parameter name: (identifier) @local)

(field_access field: (identifier) @usage.void)
(identifier) @usage

(method_declaration (formal_parameters) @scope)
(method_declaration (block) @scope.merge)
(constructor_declaration (formal_parameters) @scope)
(constructor_declaration (constructor_body) @scope.merge)
[(class_body) (interface_body) (enum_body)] @scope
(for_statement) @scope
(if_statement consequence: (_) @scope)
(if_statement alternative: (_) @scope)
(while_statement body: (_) @scope)
(try_statement (block) @scope)
(catch_clause) @scope
(block) @scope
