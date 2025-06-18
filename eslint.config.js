import tseslint from "typescript-eslint";

export default tseslint.config({
	extends: [
		"eslint:recommended",
		...tseslint.configs.recommended,
		...tseslint.configs.recommendedRequiringTypeChecking,
	],
	parserOptions: {
		project: "./tsconfig.json",
		tsconfigRootDir: import.meta.dirname,
	},
	rules: {
		"@typescript-eslint/no-unused-vars": "error",
		"@typescript-eslint/no-explicit-any": "warn",
		"@typescript-eslint/prefer-const": "error",
	},
	ignores: ["node_modules", "dist"],
});
