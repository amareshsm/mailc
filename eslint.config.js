import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Hard errors — these are never acceptable in this codebase
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-console': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      }],

      // Warnings — stylistic, fix gradually
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/array-type': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/consistent-generic-constructors': 'warn',
      '@typescript-eslint/class-literal-property-style': 'warn',
    },
  },
  {
    // CLI / build scripts — Node runtime, console is the output channel,
    // and `.mjs` files are untyped so don't require return-type annotations.
    files: ['scripts/**/*.{ts,mjs}'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    // Example files — demo/compile scripts where console is the intended output.
    files: ['examples/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    // MCP server — standalone Node package. Handlers return complex untyped JSON
    // shapes; requiring explicit return types adds noise without safety.
    files: ['mcp-server/**/*.{ts,mjs}'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      '*.config.ts',
      'src/template/agent-builder-demo.ts',
      // All build outputs — root and nested.
      '**/dist/',
      '**/.next/',
      // Subpackages have their own ESLint configs; lint via their own scripts.
      'playground/**',
      'site/**',
    ],
  },
);
