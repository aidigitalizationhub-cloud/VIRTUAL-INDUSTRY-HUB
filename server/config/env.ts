try {
  process.loadEnvFile('.env');
} catch {}

export const PORT = Number(process.env.PORT || 3000);

export const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const isValidKey = (key: unknown): boolean => {
  if (!key) return false;
  const k = String(key).trim();
  if (k === '' || k === 'undefined' || k === 'null' || k.startsWith('sb_') || k.length < 10) return false;
  return true;
};

export const isValidSupabaseServiceKey = (key: unknown): boolean => {
  if (!key) return false;
  const k = String(key).trim().replace(/^['"]|['"]$/g, '');
  if (!k || k === 'undefined' || k === 'null' || k.includes('your-')) return false;
  if (/^(gsk_|AIza|sk-|xai-|hf_)/i.test(k)) return false;
  return k.startsWith('eyJ') || k.startsWith('sb_secret_') || k.startsWith('sb_service_role_');
};

export const isSupabaseApiKeyError = (error: unknown): boolean => {
  const message = String((error as any)?.message || '').toLowerCase();
  return message.includes('invalid api key') || message.includes('service_role') || message.includes('anon');
};
