(class_definition) @scope
(function_definition) @scope
(for_statement) @scope

(parameters (identifier) @local)
(assignment left: (identifier) @local)
(function_definition name: (identifier) @local.escape)
(class_definition name: (identifier) @local.escape)
(for_statement left: (identifier) @local)

(identifier) @usage
