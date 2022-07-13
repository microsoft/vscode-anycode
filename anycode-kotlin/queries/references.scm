(call_expression (simple_identifier) @ref.method)

(delegation_specifier (user_type (type_identifier) @ref.interface))
(delegation_specifier (constructor_invocation (user_type (type_identifier) @ref.class)))

(navigation_expression (simple_identifier) @ref)

(navigation_suffix (simple_identifier)@ref)

(assignment (directly_assignable_expression) (simple_identifier) @ref)

(call_suffix (value_arguments (value_argument (simple_identifier) @ref)))
