// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * ESLint configuration for NestJS applications
 */
module.exports = {
  extends: ['./base.js'],
  rules: {
    // NestJS often uses empty constructors for DI
    '@typescript-eslint/no-empty-function': 'off',

    // Allow any for decorators metadata
    '@typescript-eslint/no-explicit-any': 'off',

    // NestJS uses require for dynamic imports
    '@typescript-eslint/no-var-requires': 'off',

    // Interface naming convention
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: {
          regex: '^I[A-Z]',
          match: false,
        },
      },
    ],

    // Consistent return types
    '@typescript-eslint/explicit-function-return-type': [
      'warn',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      },
    ],
  },
  overrides: [
    {
      files: ['*.spec.ts', '*.e2e-spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};
