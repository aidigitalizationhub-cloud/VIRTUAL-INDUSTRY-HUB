const authHeaders = async (): Promise<Record<string, string>> => {
  return { 'Content-Type': 'application/json' };
};

const requestWithTimeout = async (url: string, init: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
};

export const getJson = async <T = any>(url: string): Promise<T> => {
  const res = await requestWithTimeout(url, { headers: await authHeaders(), credentials: 'include' });
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
  const res = await requestWithTimeout(url, {
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

export const putJson = async <T = any>(url: string, body: any): Promise<T> => {
  const res = await requestWithTimeout(url, {
    method: 'PUT',
    headers: await authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      if (errData?.error) message = errData.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
};

export const deleteJson = async <T = any>(url: string): Promise<T> => {
  const res = await requestWithTimeout(url, {
    method: 'DELETE',
    headers: await authHeaders(),
    credentials: 'include',
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      if (errData?.error) message = errData.error;
    } catch {}
    throw new Error(message);
  }
  return res.json();
};
