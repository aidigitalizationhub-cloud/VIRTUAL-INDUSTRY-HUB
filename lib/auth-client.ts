import { createAuthClient } from "better-auth/react";

const configuredAuthURL = (import.meta as any).env.VITE_BETTER_AUTH_URL || window.location.origin;
const authURL = configuredAuthURL.replace(/\/$/, '').endsWith('/api/auth')
  ? configuredAuthURL.replace(/\/$/, '')
  : `${configuredAuthURL.replace(/\/$/, '')}/api/auth`;

export const authClient = createAuthClient({
  // Same-origin is the safe production default; localhost is only for local development.
  baseURL: configuredAuthURL,
  fetchOptions: {
    credentials: "include",
  },
});

export const getAuthUser = async (): Promise<{ id: string; email?: string; name?: string } | null> => {
  const response = await fetch(`${authURL}/get-session`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const result: any = await response.json();
  return result?.data?.user || result?.user || null;
};

// Keep the login path explicit. This avoids relying on the dynamic client proxy
// for the critical admin sign-in request.
export const signInWithEmail = async (email: string, password: string) => {
  const response = await fetch(`${authURL}/sign-in/email`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const result: any = await response.json().catch(() => null);
  if (!response.ok) {
    return {
      ...result,
      error: result?.error || { message: result?.message || "Authentication failed." },
    };
  }
  return result;
};

// Re-export useful hooks for convenience
export const { useSession, signIn, signUp, signOut } = authClient;
