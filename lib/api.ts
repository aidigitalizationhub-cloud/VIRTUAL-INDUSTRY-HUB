import { supabase } from './supabase';

const authHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const getJson = async <T = any>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: await authHeaders() });
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
