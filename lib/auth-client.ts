import { createAuthClient } from 'better-auth/react';
import { nextCookies } from 'better-auth/next-js';

const baseURL = typeof window !== 'undefined' 
  ? window.location.origin 
  : process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

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
  forgetPassword,
  resetPassword,
} = authClient as any;
