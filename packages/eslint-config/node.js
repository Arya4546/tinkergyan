import globals from 'globals';

/**
 * Creates the Node-focused ESLint configuration for API and tooling files.
 *
 * @returns {import('eslint').Linter.Config[]}
 */
export function createNodeConfig() {
  return [
    {
      files: [
        '*.config.{js,cjs,mjs,ts}',
        '*.mjs',
        'apps/api/**/*.{ts,js,mjs,cjs}',
        // Test scripts run in Node (node --test), not in the browser.
        'apps/web/tests/**/*.{js,mjs,cjs}',
        'packages/**/*.{ts,js,mjs,cjs}',
        'setup-husky.mjs',
      ],
      languageOptions: {
        globals: {
          ...globals.node,
        },
      },
    },
  ];
}
