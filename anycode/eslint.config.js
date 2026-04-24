const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
	{
		ignores: [
			'**/*.d.ts',
			'**/*.js',
			'**/fixtures/**',
		],
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2015,
			sourceType: 'module',
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			curly: 'warn',
			eqeqeq: 'warn',
			'no-throw-literal': 'warn',
			semi: 'warn',
		},
	},
];
