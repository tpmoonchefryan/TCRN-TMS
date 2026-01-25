// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

module.exports = {
  root: true,
  extends: ['@tcrn/eslint-config/base'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  // Node.js 20+ environment with native fetch
  env: {
    node: true,
    es2024: true,
  },
  // Node.js 18+ native globals (explicit declaration for ESLint)
  globals: {
    fetch: 'readonly',
    AbortSignal: 'readonly',
    Response: 'readonly',
    Request: 'readonly',
    Headers: 'readonly',
  },
};