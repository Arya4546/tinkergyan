import type { Linter } from 'eslint';

import { createBaseConfig } from '@tinkergyan/eslint-config/base';
import { createNodeConfig } from '@tinkergyan/eslint-config/node';
import { createReactConfig } from '@tinkergyan/eslint-config/react';

const config: Linter.Config[] = [
  ...createBaseConfig({ tsconfigRootDir: import.meta.dirname }),
  ...createNodeConfig(),
  ...createReactConfig(),
];

export default config;
