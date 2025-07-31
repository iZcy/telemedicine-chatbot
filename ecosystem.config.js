// This file exists for compatibility with PM2 ES modules
// The actual configuration is in ecosystem.config.cjs
// This redirect ensures PM2 works regardless of which file is called

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export default require('./ecosystem.config.cjs');