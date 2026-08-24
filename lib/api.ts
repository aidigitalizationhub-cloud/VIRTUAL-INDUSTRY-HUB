import { supabase } from './supabase';

const authHeaders = async (): Promise<Record<string, string>> => {
  // Better Auth uses httpOnly cookie (credentials:'include'), Supabase uses Bearer JWT.
  // Send both when available so server dual-mode authenticateUser can accept either.
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {}
  return headers;
};

export const getJson = async <T = any>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: await authHeaders(), credentials: 'include' });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      if (errData?.error) message = errData.error;
    } catch {
      // ignore parse errors; use status-based message
    }
    throw new Error(message);
  }
  return res.json();
};

export const postJson = async <T = any>(url: string, body: any): Promise<T> => {
  const headers = await authHeaders();
  const res = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      if (errData?.error) message = errData.error;
    } catch {
      // ignore parse errors; use status-based message
    }
    throw new Error(message);
  }

  return res.json();
};
