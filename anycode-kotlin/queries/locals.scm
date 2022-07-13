
[(class_body) (function_body) (enum_class_body) (control_structure_body)] @scope
(if_expression (control_structure_body) @scope)
(while_statement) @scope
(for_statement) @scope
(do_while_statement) @scope
(try_expression (_) @scope) 
(catch_block) @scope
(finally_block) @scope
(when_entry (control_structure_body) @scope)

(primary_constructor (class_parameter (simple_identifier) @local))
(secondary_constructor (parameter (simple_identifier) @local))
(function_declaration (simple_identifier) (parameter (simple_identifier) @local))
(variable_declaration (simple_identifier) @local)

(type_identifier) @usage
(simple_identifier) @usage