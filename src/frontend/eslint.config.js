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
      globals: globals.browser,
    },
  },
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^@/features/[^/]+/.+',
            message: 'Import a feature through its public index.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    ignores: ['src/features/**/*.test.{ts,tsx}', 'src/features/**/*.spec.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^@/features/[^/]+/.+',
            message: 'Import a feature through its public index.',
          },
          {
            regex: '^@/app(?:/|$)',
            message: 'Features must not depend on application composition.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            regex: '^(?:@/(?:app|features)(?:/|$)|(?:\\.\\./)+(?:app|features)(?:/|$))',
            message: 'Shared modules must remain domain-neutral.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/features/*/index.ts'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: 'ExportAllDeclaration',
        message: 'Feature public APIs must use explicit exports.',
      }],
    },
  },
])
