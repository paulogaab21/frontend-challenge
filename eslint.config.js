import js from '@eslint/js'
import pluginQuery from '@tanstack/eslint-plugin-query'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'playwright-report',
      'test-results',
      'lighthouse/reports',
      'public/mockServiceWorker.js',
      'src/routeTree.gen.ts',
      '.design',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...pluginQuery.configs['flat/recommended'],
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // The app talks to the network only through the Axios client in src/lib/http.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Use the Axios client from @/lib/http instead of fetch.' },
      ],
    },
  },
  {
    // Route files export route objects next to components; shadcn files export variants.
    files: ['src/routes/**/*.{ts,tsx}', 'src/components/ui/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Mock layer, tests and scripts are allowed to use fetch and node globals.
    files: [
      'src/mocks/**/*.{ts,tsx}',
      'e2e/**/*.ts',
      '*.config.{ts,js}',
      'scripts/**',
      'lighthouse/**',
    ],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { 'no-restricted-globals': 'off' },
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'lighthouse/**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: globals.node },
  },
)
