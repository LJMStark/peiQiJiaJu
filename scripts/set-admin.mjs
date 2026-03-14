import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL must be set before running scripts.');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 1,
});

const email = process.argv[2];

if (!email) {
  console.error('用法: node --env-file=.env scripts/set-admin.mjs <user-email>');
  process.exit(1);
}

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query('UPDATE "user" SET role = $1 WHERE email = $2 RETURNING *', ['admin', email]);
    if (res.rowCount && res.rowCount > 0) {
      console.log(`成功将用户 ${email} 的权限设置为 admin。`);
    } else {
      console.log(`未找到邮箱为 ${email} 的用户，请检查是否拼写错误或该用户尚未注册。`);
    }
  } catch (err) {
    console.error('更新失败:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
