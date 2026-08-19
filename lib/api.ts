import { supabase } from './supabase';

export const postJson = async <T = any>(url: string, body: any): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
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
