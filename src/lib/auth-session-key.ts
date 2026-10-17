/**
 * The name under which the browser keeps a signed-in session (story S1-E1-04).
 *
 * Who uses it: src/lib/supabase.ts gives it to the Supabase client, and the end-to-end tests in
 * e2e/ use it to sign a seed persona in without a sign-in screen (that screen is S1-E2-05).
 * Why a file of its own: the tests run in Node, where the browser-only parts of supabase.ts
 * (import.meta.env) don't exist; this file has nothing but the name.
 * The name says what it is and nothing about the product, so a rename never touches it
 * (CLAUDE.md: names are settings, not code).
 */

/** The localStorage key for the signed-in session. */
export const AUTH_SESSION_STORAGE_KEY = 'auth-session';
