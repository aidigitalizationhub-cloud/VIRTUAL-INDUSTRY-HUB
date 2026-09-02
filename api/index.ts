import { createRequire } from 'node:module';

process.env.VERCEL_FUNCTION = '1';

const require = createRequire(import.meta.url);
const handler = require('../dist/server.cjs').default;

export default handler;
