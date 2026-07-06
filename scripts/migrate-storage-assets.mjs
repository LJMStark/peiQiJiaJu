import { Client } from 'pg';

const databaseUrl = process.env.DATABASE_URL ?? process.env.DIRECT_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DIRECT_URL must be set before running storage:migrate.');
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

-- Required before generation history request paths can run.
alter table generation_history
  add column if not exists selected_furniture_item_ids text[];

alter table generation_history
  add column if not exists selected_furnitures_snapshot jsonb;

create index if not exists furniture_items_user_id_created_at_idx
  on furniture_items (user_id, created_at desc);

create index if not exists room_images_user_id_created_at_idx
  on room_images (user_id, created_at desc);

create index if not exists generation_history_user_id_created_at_idx
  on generation_history (user_id, created_at desc);

create index if not exists generation_history_user_id_created_at_id_idx
  on generation_history (user_id, created_at desc, id desc);
`;

await client.connect();
await client.query(sql);

console.log('Storage tables are ready. R2 buckets are managed outside this database migration.');

await client.end();
