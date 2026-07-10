import type { Linter } from 'eslint';

import { createBaseConfig } from '@tinkergyan/eslint-config/base';
import { createNodeConfig } from '@tinkergyan/eslint-config/node';
import { createReactConfig } from '@tinkergyan/eslint-config/react';

const config: Linter.Config[] = [
  // Ignore Prisma auto-generated client files — they contain patterns ESLint flags
  // but are machine-generated and must not be modified.
  { ignores: ['**/generated/**'] },
  ...createBaseConfig({ tsconfigRootDir: import.meta.dirname }),
  ...createNodeConfig(),
  ...createReactConfig(),
];

export default config;
