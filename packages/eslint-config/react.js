import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * Creates the React-focused ESLint configuration for the web application.
 *
 * @returns {import('eslint').Linter.Config[]}
 */
export function createReactConfig() {
  return [
    {
      files: ['apps/web/**/*.{ts,tsx,js,jsx}'],
      languageOptions: {
        globals: {
          ...globals.browser,
        },
      },
      plugins: {
        'react-hooks': reactHooks,
        'react-refresh': reactRefresh,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        'react-refresh/only-export-components': [
          'warn',
          {
            allowConstantExport: true,
          },
        ],
      },
    },
  ];
}
