/**
 * The one Supabase client the browser uses (story S1-E1-04; architecture 1.5).
 *
 * Who calls it: the api/ files in src/features/<feature>/, starting with
 * src/features/language/api/profileLocale.ts. Screens never call it directly; they use a hook.
 * What it calls next: the Supabase API (Auth, and the database through row-level security) at
 * VITE_SUPABASE_URL, with the public anon key. Every rule about who may read or change what lives
 * in the database, not here (architecture 1.1, principle 3).
 * Security: only the public anon key may be used here, never the service role key (CLAUDE.md
 * rule 2); `npm run scan:bundle` fails the build if a service role key reaches the bundle.
 * Optional on purpose: when the two variables are missing (a Cloudflare preview before they are
 * set, or a unit test), getSupabaseClient() returns null and the app keeps working with
 * device-only settings, such as the language choice kept in this browser.
 * Loaded on demand: the Supabase library is about a third of the app's code, so it is fetched as
 * its own file after the page first draws, keeping the first paint fast on phones.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import { AUTH_SESSION_STORAGE_KEY } from './auth-session-key';
import type { Database } from './database.types';

/** The client type, typed from the generated database types (CLAUDE.md rule 14). */
export type AppSupabaseClient = SupabaseClient<Database>;

/** The client once it is being made; undefined until the first call. */
let cachedClient: Promise<AppSupabaseClient | null> | undefined;

/**
 * Returns the shared Supabase client, making it on the first call.
 *
 * @returns the client, or null when VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set
 * Errors: rejects only if the library file can't be downloaded (the network dropped); a bad address
 *   only fails when a request is made. Each api/ file handles failures where they happen.
 */
export function getSupabaseClient(): Promise<AppSupabaseClient | null> {
  // Step 1: reuse the client already made (or being made), so the whole app shares one session.
  // If the library couldn't be downloaded, forget the failure so the next call tries again.
  cachedClient ??= makeClient().catch((error: unknown) => {
    cachedClient = undefined;
    throw error;
  });
  return cachedClient;
}

/**
 * Makes the client from the build's settings.
 *
 * @returns the new client, or null without settings
 */
async function makeClient(): Promise<AppSupabaseClient | null> {
  // Step 2: read the two public values Vite copied into the bundle at build time.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

  // Step 3: without them there is no account to talk to; the app runs on device settings only.
  if (supabaseUrl === '' || anonKey === '') return null;

  // Step 4: fetch the library, then make the client. It keeps the session in this browser under
  // a fixed name and refreshes it before it expires.
  const { createClient } = await import('@supabase/supabase-js');
  return createClient<Database>(supabaseUrl, anonKey, {
    auth: { storageKey: AUTH_SESSION_STORAGE_KEY, persistSession: true, autoRefreshToken: true },
  });
}
