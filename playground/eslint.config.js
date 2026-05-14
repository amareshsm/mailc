import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Newer opinionated react-hooks v5 rules — high false-positive rate on
      // valid patterns (registry lookups returning stable component refs,
      // intentional state-reset on prop change). Rely on exhaustive-deps +
      // manual review for real bugs.
      'react-hooks/static-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      // HMR hint, not a runtime concern. Keep visible as warning.
      'react-refresh/only-export-components': 'warn',
    },
  },
])
