import js from '@eslint/js';

export default [
  {
    // output/: generated data and throwaway scripts (gitignored)
    ignores: ['scripts/**', 'output/**'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        performance: 'readonly',
        structuredClone: 'readonly',
        atob: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
