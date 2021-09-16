(function_item name: (identifier) @definition)
(const_item name: (identifier) @definition)
(static_item name: (identifier) @definition)
(let_declaration pattern: (identifier) @definition)
(parameter pattern: (identifier) @definition)
(for_expression pattern: (identifier) @definition)
(reference_pattern (identifier) @definition)
(tuple_pattern (identifier) @definition)

(scoped_identifier name: (identifier) @usage.void)
(identifier) @usage

(mod_item body: (declaration_list) @scope)
(for_expression) @scope
(function_item (parameters) @scope)
(function_item (block) @scope.merge)
(block) @scope
