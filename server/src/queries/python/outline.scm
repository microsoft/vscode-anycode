(class_definition
	name: (identifier) @class.name) @class

(function_definition
	name: (identifier) @function.name) @function

(module
	(expression_statement 
		(assignment left: (identifier) @var)))
