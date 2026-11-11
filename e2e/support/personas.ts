/**
 * Signs a seed persona in for an end-to-end test, without a sign-in screen (story S1-E1-04; the
 * sign-in screen itself is S1-E2-05).
 *
 * Who calls it: e2e/*.spec.ts files that need a signed-in person.
 * What it calls: the local Supabase (started with `npx supabase start`), whose address and public
 * anon key playwright.config.ts puts in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. It signs the
 * persona in with the shared test password, then hands the session to the browser the same way
 * the app keeps it (localStorage under AUTH_SESSION_STORAGE_KEY), so the page opens signed in.
 * Test data: seed personas only (supabase/seed.sql), never real accounts (CLAUDE.md).
 */
import type { BrowserContext } from '@playwright/test';
import { createClient, type Session } from '@supabase/supabase-js';

import { AUTH_SESSION_STORAGE_KEY } from '../../src/lib/auth-session-key';
import type { Database } from '../../src/lib/database.types';

/** The shared password of every synthetic seed persona (supabase/README.md). */
const PERSONA_PASSWORD = 'Persona-Test-2026!';

/** The seed personas the epic checks walk through, one by one. */
export type PersonaName = 'adult_writer' | 'teen_17' | 'kid_14_ok' | 'kid_14_waiting';

/**
 * Every seed persona a test may sign in as (teacher is changed only by e2e/usernames.spec.ts and,
 * for its initials colour, e2e/initials-colour.spec.ts;
 * support and editor joined for the admin shell, S1-E11-01; blocker and blocked for blocks,
 * S1-E5-05; pending_check and failed_check for the comments' accessibility checks, READ-2,
 * because no other spec changes their language; suspended_user for Story Atlas's checks, ATLAS-a,
 * for the same reason).
 */
export type SignInPersonaName =
  | PersonaName
  | 'teacher'
  | 'owner'
  | 'admin'
  | 'moderator'
  | 'support'
  | 'editor'
  | 'blocker'
  | 'blocked'
  | 'pending_check'
  | 'failed_check'
  | 'suspended_user';

/**
 * Makes a Supabase client for the test itself (not the browser), using the local stack's values.
 *
 * @returns a client that keeps no session on disk
 * Errors: throws with the fix when Supabase isn't running or its values weren't found.
 */
export function makeTestClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (supabaseUrl === '' || anonKey === '') {
    throw new Error(
      'These tests need the local Supabase. Run `npx supabase start`, then `npm run test:e2e` again.',
    );
  }
  return createClient<Database>(supabaseUrl, anonKey, { auth: { persistSession: false } });
}

/**
 * Signs a persona in and returns its session and a client acting as that persona.
 *
 * @param persona - which seed persona
 * @returns the session (to hand to a browser) and the signed-in client (for set-up and clean-up)
 * Errors: throws when the sign-in is refused, naming the persona.
 */
export async function signInPersona(persona: SignInPersonaName) {
  const client = makeTestClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: `${persona}@personas.test`,
    password: PERSONA_PASSWORD,
  });
  if (error !== null || data.session === null) {
    throw new Error(`Could not sign ${persona} in: ${error?.message ?? 'no session returned'}`);
  }
  return { session: data.session, client };
}

/**
 * Opens every page of a browser context already signed in with the given session.
 *
 * @param context - a fresh Playwright browser context (one "device")
 * @param session - the session from signInPersona()
 */
export async function useSessionInBrowser(context: BrowserContext, session: Session) {
  await context.addInitScript(
    ([storageKey, sessionJson]) => {
      window.localStorage.setItem(storageKey, sessionJson);
    },
    [AUTH_SESSION_STORAGE_KEY, JSON.stringify(session)] as const,
  );
}
