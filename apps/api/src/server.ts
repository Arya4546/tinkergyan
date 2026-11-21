console.log('🚀 [BOOT] Starting Tinkergyan API...');
import 'dotenv/config';

import { createApp } from './app';
import { env } from './env';
import { logger } from './lib/logger';
import { ensureSuperAdmin } from './services/admin-bootstrap.service';

const app = createApp();

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'API server listening');
});

// Make sure the super admin exists. A failure here (e.g. the database is not
// reachable yet) is logged but must never stop the API from serving everyone else.
ensureSuperAdmin().catch((err: unknown) => {
  logger.error({ err }, 'Super admin bootstrap failed');
});
