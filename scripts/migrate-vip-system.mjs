import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL must be set before running migrations.');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 1,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Starting VIP system migration...');

    // Add columns to user table if they do not exist
    const { rows: columns } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='user' AND (column_name='role' OR column_name='vipExpiresAt');
    `);

    const colNames = columns.map(c => c.column_name);

    if (!colNames.includes('role')) {
      console.log('Adding column "role" to "user" table...');
      await client.query(`ALTER TABLE "user" ADD COLUMN "role" TEXT DEFAULT 'user'`);
    }

    if (!colNames.includes('vipExpiresAt')) {
      console.log('Adding column "vipExpiresAt" to "user" table...');
      await client.query(`ALTER TABLE "user" ADD COLUMN "vipExpiresAt" TIMESTAMP`);
    }

    console.log("Creating redemption_codes table...");
    try {
      await client.query(`
        CREATE TABLE "redemption_codes" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "code" TEXT UNIQUE NOT NULL,
          "days" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'active',
          "used_by" TEXT REFERENCES "user"(id) ON DELETE SET NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
          "used_at" TIMESTAMP
        )
      `);
    } catch (createErr) {
      if (createErr.code === '42P07') {
        console.log('redemption_codes table already exists, skipping creation.');
      } else {
        throw createErr;
      }
    }

    console.log('VIP system migration applied successfully.');
  } catch (error) {
    console.error('Error during migration:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
