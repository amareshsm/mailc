/**
 * Site ESLint config — kept intentionally permissive.
 *
 * The default Next.js build (`next build`) skips lint via `eslint.ignoreDuringBuilds`.
 * Running `eslint .` directly without ignores walks into `.next/`, `.source/`,
 * and generated MDX output and produces tens of thousands of false positives.
 *
 * This config:
 *  - Ignores generated/build folders explicitly.
 *  - Allows `console.*` because docs site is a leaf app, not a library.
 */

import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      '.source/**',
      'node_modules/**',
      'out/**',
      'dist/**',
      'next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'all', argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },
)
