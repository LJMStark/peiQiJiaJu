import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL must be set before running invite:migrate.');
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

  console.error('Postgres connection error during invite migration:', error.message);
});

async function run() {
  await client.connect();

  try {
    console.log('Starting invite system migration...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS invite_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inviter_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        code TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        rotated_at TIMESTAMP,
        rotated_by_user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
        rotation_reason TEXT,
        CONSTRAINT invite_links_status_check
          CHECK (status IN ('active', 'rotated', 'disabled'))
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS invite_links_one_active_per_inviter_idx
      ON invite_links (inviter_user_id)
      WHERE status = 'active'
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS invite_links_inviter_created_idx
      ON invite_links (inviter_user_id, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invite_referrals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invite_link_id UUID NOT NULL REFERENCES invite_links(id) ON DELETE RESTRICT,
        inviter_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        invitee_user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        attributed_at TIMESTAMP NOT NULL DEFAULT NOW(),
        verified_at TIMESTAMP,
        attribution_method TEXT NOT NULL,
        invitee_email_snapshot TEXT NOT NULL,
        invitee_company_snapshot TEXT,
        CONSTRAINT invite_referrals_status_check
          CHECK (status IN ('registered', 'verified')),
        CONSTRAINT invite_referrals_method_check
          CHECK (attribution_method IN ('signup', 'late-claim'))
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS invite_referrals_invitee_unique_idx
      ON invite_referrals (invitee_user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS invite_referrals_inviter_status_idx
      ON invite_referrals (inviter_user_id, status, attributed_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS invite_referrals_recent_idx
      ON invite_referrals (attributed_at DESC)
    `);

    await client.query('COMMIT');
    console.log('Invite system migration applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during invite migration:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

run().catch(console.error);
