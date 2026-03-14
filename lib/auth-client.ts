import { createAuthClient } from 'better-auth/react';
import { nextCookies } from 'better-auth/next-js';

const baseURL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

export const authClient = createAuthClient({
  baseURL,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  sendVerificationEmail,
} = authClient;
