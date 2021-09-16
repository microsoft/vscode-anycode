(const_spec name: (identifier) @definition)
(var_declaration (var_spec (identifier) @definition))
(parameter_declaration (identifier) @definition)
(short_var_declaration left: (expression_list (identifier) @definition))
(range_clause left: (expression_list (identifier) @definition))
(type_switch_statement (expression_list (identifier) @definition))

(identifier) @usage

(method_declaration parameters: (parameter_list) @scope)
(method_declaration body: (block) @scope.merge)
(function_declaration parameters: (parameter_list) @scope)
(function_declaration body: (block) @scope.merge)
(expression_switch_statement) @scope
(for_statement) @scope
(block) @scope
(type_switch_statement) @scope
(composite_literal body: (literal_value)  @scope)
