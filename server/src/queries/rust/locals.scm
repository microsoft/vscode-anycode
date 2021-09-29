(function_item name: (identifier) @local)
(const_item name: (identifier) @local)
(static_item name: (identifier) @local)
(let_declaration pattern: (identifier) @local)
(parameter pattern: (identifier) @local)
(for_expression pattern: (identifier) @local)
(reference_pattern (identifier) @local)
(tuple_pattern (identifier) @local)
(self_parameter (self) @local)

(scoped_identifier name: (identifier) @usage.void)
(identifier) @usage
(self) @usage

(mod_item body: (declaration_list) @scope.exports)
(for_expression) @scope
(function_item (parameters) @scope)
(function_item (block) @scope.merge)
(block) @scope
