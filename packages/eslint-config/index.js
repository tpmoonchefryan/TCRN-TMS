// SPDX-License-Identifier: Apache-2.0
// ESLint Shared Config for TCRN TMS (Flat Config Format)
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import importX from 'eslint-plugin-import-x';

/**
 * 共享 ESLint 配置 - 适用于所有工作区
 * 基于 ESLint v9 Flat Config 格式
 */
export default [
  // 基础 TypeScript 配置
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'import-x': importX,
    },
    rules: {
      // TypeScript 规则
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': [
        'warn',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': 'allow-with-description',
        },
      ],

      // Import 规则
      'import-x/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import-x/no-duplicates': 'warn',
      'import-x/newline-after-import': 'warn',

      // 通用规则
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-useless-assignment': 'warn',
      'no-debugger': 'warn',
      'no-empty': 'warn',
    },
  },

  // Prettier 配置（禁用冲突规则）
  prettier,
];

/**
 * Next.js 特定配置
 */
export const nextConfig = {
  files: ['**/*.{js,jsx,ts,tsx}'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@next/next/no-html-link-for-pages': 'off',
  },
};

/**
 * NestJS 特定配置
 */
export const nestConfig = {
  files: ['**/*.ts'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': 'off', // NestJS 使用 Logger
  },
};

/**
 * 测试文件配置
 */
export const testConfig = {
  files: ['**/*.{test,spec}.{ts,tsx}', '**/tests/**', '**/e2e/**'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-console': 'off',
  },
};
