(method_declaration) @scope
(function_declaration) @scope
(expression_switch_statement) @scope
(for_statement) @scope
(block) @scope
(type_switch_statement) @scope
(composite_literal body: (literal_value) @scope)

(const_spec name: (identifier) @local)
(var_declaration (var_spec (identifier) @local))
(parameter_declaration (identifier) @local)
(short_var_declaration left: (expression_list (identifier) @local))
(range_clause left: (expression_list (identifier) @local))
(type_switch_statement (expression_list (identifier) @local))
(function_declaration name: (identifier) @local.escape)
(method_declaration name: (field_identifier) @local.escape)

(identifier) @usage
