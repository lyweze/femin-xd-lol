import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'clients/web-pwa',
    'clients/**/web',
    'clients/**/web-bundle',
    'clients/**/dist-desktop',
    'clients/**/build',
    'clients/**/.expo',
    'clients/**/android',
    'clients/**/ios',
    'clients/react-native-expo/src/core',
  ]),
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['clients/react-native-expo/App.js'],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: {
        ...globals.browser,
        process: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['public/sw.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
  {
    files: [
      'vite.config.js',
      'scripts/**/*.mjs',
      'tests/**/*.mjs',
      'clients/desktop-electron/*.js',
      'clients/macos-native/scripts/**/*.mjs',
    ],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
])
