import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL must be set before running generation-telemetry:migrate.');
}

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

client.on('error', (error) => {
  if (
    error.code === 'ERR_SSL_DECRYPTION_FAILED_OR_BAD_RECORD_MAC' ||
    error.message.includes('decryption failed or bad record mac')
  ) {
    return;
  }

  console.error('Postgres connection error during generation telemetry migration:', error.message);
});

async function run() {
  await client.connect();

  try {
    console.log('Starting generation telemetry migration...');
    await client.query('BEGIN');

    // gen_random_uuid() lives in pgcrypto on older PG versions. Idempotent.
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await client.query(`
      CREATE TABLE IF NOT EXISTS generation_failures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
        request_id TEXT,
        route TEXT NOT NULL,
        status_code INTEGER,
        error_code TEXT,
        error_message TEXT,
        duration_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS generation_failures_created_at_idx
      ON generation_failures (created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS generation_failures_route_created_idx
      ON generation_failures (route, created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS generation_failures_user_created_idx
      ON generation_failures (user_id, created_at DESC)
    `);

    await client.query('COMMIT');
    console.log('Generation telemetry migration applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during generation telemetry migration:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
