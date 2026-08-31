process.env.VERCEL_FUNCTION = '1';

module.exports = require('../dist/server.cjs').default;
