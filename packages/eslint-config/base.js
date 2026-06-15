import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import unusedImports from 'eslint-plugin-unused-imports';

/**
 * Creates the shared baseline ESLint configuration for the monorepo.
 *
 * @param {{ tsconfigRootDir: string }} options - Root directory used for TypeScript project discovery.
 * @returns {import('eslint').Linter.Config[]}
 */
export function createBaseConfig({ tsconfigRootDir }) {
  return [
    {
      ignores: [
        '.husky/_/**',
        '.turbo/**',
        'build/**',
        'coverage/**',
        'dist/**',
        'node_modules/**',
        '**/.husky/_/**',
        '**/.turbo/**',
        '**/build/**',
        '**/coverage/**',
        '**/dist/**',
        '**/node_modules/**',
      ],
      linterOptions: {
        reportUnusedDisableDirectives: 'error',
      },
    },
    js.configs.recommended,
    {
      files: ['**/*.{ts,tsx,mts,cts,js,mjs,cjs}'],
      rules: {
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
    ...tseslint.configs.recommendedTypeChecked,
    {
      ...tseslint.configs.disableTypeChecked,
      files: ['**/*.{js,mjs,cjs}'],
    },
    {
      files: ['**/*.{ts,tsx,mts,cts}'],
      languageOptions: {
        parserOptions: {
          projectService: {
            allowDefaultProject: [
              '*.config.{js,cjs,mjs,ts}',
              '*.{js,cjs,mjs,ts}',
              'apps/*/tailwind.config.ts',
              'apps/*/postcss.config.js',
              'setup-husky.mjs',
            ],
            defaultProject: 'tsconfig.eslint.json',
          },
          tsconfigRootDir,
        },
      },
      plugins: {
        'unused-imports': unusedImports,
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            prefer: 'type-imports',
          },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unsafe-assignment': 'warn',
        '@typescript-eslint/no-unsafe-call': 'warn',
        '@typescript-eslint/no-unsafe-member-access': 'warn',
        '@typescript-eslint/no-unsafe-return': 'warn',
        '@typescript-eslint/no-unsafe-argument': 'warn',
        '@typescript-eslint/no-floating-promises': 'warn',
        '@typescript-eslint/no-misused-promises': 'warn',
        '@typescript-eslint/no-unused-vars': 'off',
        'unused-imports/no-unused-imports': 'error',
        'unused-imports/no-unused-vars': [
          'error',
          {
            args: 'after-used',
            argsIgnorePattern: '^_',
            vars: 'all',
            varsIgnorePattern: '^_',
          },
        ],
      },
    },
    eslintConfigPrettier,
  ];
}
