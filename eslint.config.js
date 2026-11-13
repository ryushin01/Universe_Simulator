// @ts-check
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import solid from 'eslint-plugin-solid/configs/typescript'
import globals from 'globals'

export default defineConfig([
  globalIgnores([
    'dist/**',
    'storybook-static/**',
    'playwright-report/**',
    'test-results/**',
    'lhci-report/**',
    '.lighthouseci/**',
    'coverage/**',
    'public/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx}'], ...solid },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
])
