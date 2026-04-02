import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

if (!existsSync(path.resolve('.git'))) {
  console.warn('Skipping Husky setup because this workspace is not a Git repository yet.');
  process.exit(0);
}

const huskyBin =
  process.platform === 'win32'
    ? path.resolve('node_modules', '.bin', 'husky.cmd')
    : path.resolve('node_modules', '.bin', 'husky');

const result = spawnSync(huskyBin, [], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
