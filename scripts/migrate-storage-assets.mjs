import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  (() => {
    const candidate = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    if (!candidate) {
      return null;
    }

    try {
      const parsed = new URL(candidate);
      const directMatch = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
      if (directMatch?.[1]) {
        return `https://${directMatch[1]}.supabase.co`;
      }

      const poolerUsernameMatch = parsed.username.match(/^postgres\.([a-z0-9]+)$/i);
      if (poolerUsernameMatch?.[1]) {
        return `https://${poolerUsernameMatch[1]}.supabase.co`;
      }
    } catch {
      return null;
    }

    return null;
  })();

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DIRECT_URL must be set before running storage:migrate.');
}

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL must be set before running storage:migrate.');
}

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set before running storage:migrate.');
}

const client = new Client({
  connectionString: databaseUrl,
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

  console.error('Postgres connection error during storage migration:', error.message);
});

const sql = `
create table if not exists furniture_items (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  name text not null,
  category text not null default '其他',
  storage_path text not null unique,
  mime_type text not null,
  file_size integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists room_images (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  name text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size integer not null,
  aspect_ratio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generation_history (
  id text primary key,
  user_id text not null references "user"(id) on delete cascade,
  room_image_id text references room_images(id) on delete set null,
  furniture_item_id text references furniture_items(id) on delete set null,
  room_name_snapshot text not null,
  room_storage_path_snapshot text not null,
  room_mime_type_snapshot text not null,
  room_file_size_snapshot integer not null,
  room_aspect_ratio_snapshot text,
  furniture_name_snapshot text not null,
  furniture_storage_path_snapshot text not null,
  furniture_mime_type_snapshot text not null,
  furniture_file_size_snapshot integer not null,
  furniture_category_snapshot text not null,
  generated_name text not null,
  generated_storage_path text not null unique,
  generated_mime_type text not null,
  generated_file_size integer not null,
  custom_instruction text,
  created_at timestamptz not null default now()
);

create index if not exists furniture_items_user_id_created_at_idx
  on furniture_items (user_id, created_at desc);

create index if not exists room_images_user_id_created_at_idx
  on room_images (user_id, created_at desc);

create index if not exists generation_history_user_id_created_at_idx
  on generation_history (user_id, created_at desc);
`;

await client.connect();
await client.query(sql);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const buckets = [
  { name: 'furniture-assets', mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  { name: 'room-assets', mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
  { name: 'generated-assets', mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] },
];

const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
if (listError) {
  throw new Error(`Failed to list buckets: ${listError.message}`);
}

for (const bucket of buckets) {
  const exists = existingBuckets?.some((item) => item.name === bucket.name);
  if (exists) {
    console.log(`Bucket already exists: ${bucket.name}`);
    continue;
  }

  const { error } = await supabase.storage.createBucket(bucket.name, {
    public: false,
    allowedMimeTypes: bucket.mimeTypes,
    fileSizeLimit: 10 * 1024 * 1024,
  });

  if (error) {
    throw new Error(`Failed to create bucket ${bucket.name}: ${error.message}`);
  }

  console.log(`Created bucket: ${bucket.name}`);
}

console.log('Storage tables and buckets are ready.');

await client.end();
