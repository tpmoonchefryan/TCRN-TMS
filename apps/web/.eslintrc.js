// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

module.exports = {
  root: true,
  extends: ['@tcrn/eslint-config/next'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
    react: {
      version: 'detect',
    },
  },
  // Browser + Node environment for Next.js
  env: {
    browser: true,
    node: true,
    es2024: true,
  },
  globals: {
    React: 'readonly',
    JSX: 'readonly',
    fetch: 'readonly',
    AbortSignal: 'readonly',
  },
  rules: {
    // React 17+ automatic JSX runtime - no need to import React
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    // Disable no-undef for browser/node globals (TypeScript handles this)
    'no-undef': 'off',
  },
};