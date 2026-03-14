import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveSupabaseProjectUrl } from '@/lib/storage-config';

const globalForSupabase = globalThis as typeof globalThis & {
  __supabaseAdminClient?: SupabaseClient;
};

function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set.');
  }

  return key;
}

export function getSupabaseAdmin() {
  if (globalForSupabase.__supabaseAdminClient) {
    return globalForSupabase.__supabaseAdminClient;
  }

  const client = createClient(resolveSupabaseProjectUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForSupabase.__supabaseAdminClient = client;
  }

  return client;
}
