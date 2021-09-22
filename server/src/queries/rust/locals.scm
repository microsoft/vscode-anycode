(function_item name: (identifier) @local)
(const_item name: (identifier) @local)
(static_item name: (identifier) @local)
(let_declaration pattern: (identifier) @local)
(parameter pattern: (identifier) @local)
(for_expression pattern: (identifier) @local)
(reference_pattern (identifier) @local)
(tuple_pattern (identifier) @local)

(scoped_identifier name: (identifier) @usage.void)
(identifier) @usage

(mod_item body: (declaration_list) @scope)
(for_expression) @scope
(function_item (parameters) @scope)
(function_item (block) @scope.merge)
(block) @scope
