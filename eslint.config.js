/**
 * Lint rules for the whole repository (story S1-E1-01).
 *
 * Who runs it: `npm run lint`, and CI on every pull request.
 * Why these rules: CLAUDE.md "Readable code" (decided 17 Oct 2026, 12:26). The size limits below are
 * a proposal from CLAUDE.md: complexity 10, max-depth 3, max-lines-per-function 60, max-params 4.
 * Accessibility rules (jsx-a11y) back up WCAG 2.2 AA (CLAUDE.md rule 9).
 * Prettier handles formatting, so eslint-config-prettier switches off rules that would clash with it.
 */
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Generated or third-party files are never linted.
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'node_modules',
      'src/lib/database.types.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx,js}'],
    extends: [js.configs.recommended, ...tseslint.configs.strict, prettier],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // Readable code limits (CLAUDE.md, proposal).
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
      // No nested ternaries (CLAUDE.md: clear over clever).
      'no-nested-ternary': 'error',
      // No `any` (Definition of Done: TypeScript strict with no `any` added).
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.tsx'],
    extends: [jsxA11y.flatConfigs.strict],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // One component per file, so fast refresh keeps working (CLAUDE.md conventions).
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  {
    // Test files describe many cases in one `describe` block, so the function length limit is off.
    files: ['**/*.test.{ts,tsx}', 'e2e/**/*.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
);
