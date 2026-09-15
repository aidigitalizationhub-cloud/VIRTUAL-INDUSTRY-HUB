import { createApp, startServer } from './server/app';

const app = createApp();

startServer(app).catch((err) => {
  console.error('Failed to launch server:', err);
});

export default app;
