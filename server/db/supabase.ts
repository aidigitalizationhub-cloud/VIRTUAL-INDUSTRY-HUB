import { createClient } from '@supabase/supabase-js';
import { isValidSupabaseServiceKey } from '../config/env';

let cachedServiceClient: any | null | undefined;

export const getSupabaseClient = (token?: string) => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) {
    console.warn('Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) missing in server process.env.');
    return null;
  }
  if (token) {
    return createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }
  return createClient(url, anonKey);
};

export const getServiceClient = () => {
  if (cachedServiceClient !== undefined) return cachedServiceClient;

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY missing in server process.env. Platform write operations will fall back to the caller role.');
    cachedServiceClient = null;
    return null;
  }
  if (!isValidSupabaseServiceKey(serviceKey)) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is invalid or appears to be a non-Supabase provider key.');
    cachedServiceClient = null;
    return null;
  }
  cachedServiceClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedServiceClient;
};

export const resetServiceClientForTests = () => {
  cachedServiceClient = undefined;
};

export const serviceClientConfigError = (): string => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
  if (key && !isValidSupabaseServiceKey(key)) {
    return 'Server Supabase service key is invalid. Check SUPABASE_SERVICE_ROLE_KEY and restart the server.';
  }
  return 'Server Supabase service key is missing. Set SUPABASE_SERVICE_ROLE_KEY and restart the server.';
};
