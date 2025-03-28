(multiline_comment) @comment
[(class_body) (function_body) (enum_class_body) (control_structure_body)] @scope
(if_expression (control_structure_body) @scope)
(while_statement) @scope
(for_statement) @scope
(do_while_statement) @scope
(try_expression (_) @scope) 
(catch_block) @scope
(finally_block) @scope
(when_entry (control_structure_body) @scope)
