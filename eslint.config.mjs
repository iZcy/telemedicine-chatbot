import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  js.configs.recommended,
  {
    files: ['server/**/*.{ts,js}', 'prisma/**/*.{ts,js}', 'scripts/**/*.{ts,js}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readable',
        process: 'readable',
        Buffer: 'readable',
        __dirname: 'readable',
        __filename: 'readable',
        setTimeout: 'readable',
        clearTimeout: 'readable',
        setInterval: 'readable',
        clearInterval: 'readable',
        global: 'readable',
        NodeJS: 'readable',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'vite.config.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readable',
        window: 'readable',
        document: 'readable',
        localStorage: 'readable',
        sessionStorage: 'readable',
        fetch: 'readable',
        setTimeout: 'readable',
        clearTimeout: 'readable',
        setInterval: 'readable',
        clearInterval: 'readable',
        __dirname: 'readable',
        process: 'readable',
        React: 'readable',
        JSX: 'readable',
        HTMLInputElement: 'readable',
        HTMLDivElement: 'readable',
        RequestInit: 'readable',
        URLSearchParams: 'readable',
        alert: 'readable',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-misleading-character-class': 'off',
      'no-useless-escape': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: ['dist', 'node_modules', '*.config.js', '*.config.mjs'],
  },
];
