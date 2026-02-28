/**
 * Re-export barrel — keeps existing import paths working.
 *
 * Prefer importing directly from the source modules:
 *   - Database type  → @/lib/database.types
 *   - Service client → @/lib/supabase/service
 *   - Browser client → @/lib/supabase/client
 *   - Auth client    → @/lib/supabase/server
 */
export type { Database } from '@/lib/database.types';
export { createServerSupabaseClient } from '@/lib/supabase/service';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.warn('SUPABASE_URL is not set. Database features will be disabled.');
}

/** Browser/anon Supabase client. Prefer @/lib/supabase/client in React components. */
export const supabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey)
  : null;
