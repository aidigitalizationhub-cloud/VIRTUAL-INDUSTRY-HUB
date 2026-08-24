import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: (import.meta as any).env.VITE_BETTER_AUTH_URL || "http://localhost:3000",
  fetchOptions: {
    credentials: "include",
  },
});

// Re-export useful hooks for convenience
export const { useSession, signIn, signUp, signOut } = authClient;
