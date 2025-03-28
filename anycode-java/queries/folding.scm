[(line_comment) (block_comment)] @comment
[(class_body) (interface_body) (enum_body)] @scope
(for_statement) @scope
(if_statement consequence: (_) @scope)
(if_statement alternative: (_) @scope)
(while_statement body: (_) @scope)
(try_statement (block) @scope)
(catch_clause) @scope
(block) @scope
