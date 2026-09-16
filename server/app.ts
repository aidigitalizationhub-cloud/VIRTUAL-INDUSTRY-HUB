import express from 'express';
import path from 'path';
import { PORT } from './config/env';
import { applyCoreMiddleware } from './middleware/security';
import { registerHealthRoutes } from './routes/health';
import { registerProfileRoutes } from './routes/profiles';
import { registerNewsRoutes } from './routes/news';
import { registerIpRoutes } from './routes/ip';
import { registerStorageRoutes } from './routes/storage';
import { registerProjectsRoutes } from './routes/projects';
import { registerEoisRoutes } from './routes/eois';
import { registerAiRoutes } from './routes/ai';
import { registerScoutRoutes } from './routes/scout';
import { registerChallengesRoutes } from './routes/challenges';
import { registerMatchingRoutes } from './routes/matching';
import { registerAdminRoutes } from './routes/admin';

export const createApp = () => {
  const app = express();

  applyCoreMiddleware(app);

  registerHealthRoutes(app);
  registerProfileRoutes(app);
  registerNewsRoutes(app);
  registerIpRoutes(app);
  registerStorageRoutes(app);
  registerProjectsRoutes(app);
  registerEoisRoutes(app);
  registerAiRoutes(app);
  registerScoutRoutes(app);
  registerChallengesRoutes(app);
  registerMatchingRoutes(app);
  registerAdminRoutes(app);

  return app;
};

export const startServer = async (app: ReturnType<typeof createApp>) => {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL && !process.env.VERCEL_FUNCTION) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server launched on port ${PORT}`);
    });
  }
};
