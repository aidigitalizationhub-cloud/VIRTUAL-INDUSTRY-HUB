import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { registerAiRoutes } from './routes/ai';
import { registerChallengesRoutes } from './routes/challenges';
import { registerEoisRoutes } from './routes/eois';
import { registerHealthRoutes } from './routes/health';
import { registerIpRoutes } from './routes/ip';
import { registerNewsRoutes } from './routes/news';
import { registerProfileRoutes } from './routes/profiles';
import { registerProjectsRoutes } from './routes/projects';
import { registerScoutRoutes } from './routes/scout';
import { registerStorageRoutes } from './routes/storage';
import { registerMatchingRoutes } from './routes/matching';
import { registerAdminRoutes } from './routes/admin';

describe('modular server application', () => {
  it('exposes all domain route registrars', () => {
    for (const registrar of [
      registerHealthRoutes,
      registerProfileRoutes,
      registerNewsRoutes,
      registerIpRoutes,
      registerStorageRoutes,
      registerProjectsRoutes,
      registerEoisRoutes,
      registerAiRoutes,
      registerScoutRoutes,
      registerChallengesRoutes,
      registerMatchingRoutes,
      registerAdminRoutes,
    ]) {
      expect(typeof registrar).toBe('function');
    }
  });

  it('creates an express app without throwing', () => {
    const app = createApp();
    expect(typeof (app as any).get).toBe('function');
    expect(typeof (app as any).post).toBe('function');
  });
});
