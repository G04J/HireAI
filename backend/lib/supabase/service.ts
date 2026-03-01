import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/database/database.types';

/**
 * Creates a Supabase client using the service-role key.
 * Only call this from server-side code (API routes, Server Actions, scripts).
 * Never expose the service-role key to the browser.
 */
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Supabase server client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set them in .env.local (Project Settings → API in Supabase).'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
