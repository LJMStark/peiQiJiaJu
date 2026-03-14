import { betterAuth } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
const baseURL = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.APP_URL ?? 'http://localhost:3000';
const secret =
  process.env.BETTER_AUTH_SECRET ?? 'development-only-secret-change-me-before-production';

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL must be set before running auth:migrate.');
}

const auth = betterAuth({
  baseURL,
  secret,
  database: new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 1,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async () => {},
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
  },
});

const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
  console.log('Better Auth tables are already up to date.');
  process.exit(0);
}

console.log(`Creating ${toBeCreated.length} table(s) and updating ${toBeAdded.length} table(s).`);
await runMigrations();
console.log('Better Auth migrations applied successfully.');
