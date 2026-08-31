import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // Same-origin is the safe production default; localhost is only for local development.
  baseURL: (import.meta as any).env.VITE_BETTER_AUTH_URL || window.location.origin,
  fetchOptions: {
    credentials: "include",
  },
});

// Re-export useful hooks for convenience
export const { useSession, signIn, signUp, signOut } = authClient;
