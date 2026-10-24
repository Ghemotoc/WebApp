/**
 * Logs in, sends log-in and reset links, saves a new password and logs out (story S1-E2-05).
 *
 * Who calls it: hooks/useSignInForm.ts, ForgotPasswordPage, ResetPasswordPage and AccountMenu.
 * What it calls next: Supabase Auth, plus three database functions for the pause after wrong tries
 * (…_s1_e2_05_sign_in.sql): sign_in_pause_until() and record_sign_in_failure() with a hash of the
 * email (lib/emailHash.ts), and clear_my_sign_in_failures() once logged in.
 * Never revealing who has an account: a wrong password and an unknown email give the same answer;
 * log-in and reset links say "if there's an account" whatever happens (S1-E2-05 criterion).
 * Privacy: nothing here is logged (CLAUDE.md rule 12); errors carry Supabase's error code only.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { hashEmail } from '../lib/emailHash';

/** What a log-in try answered. */
export type SignInResult =
  | { kind: 'signed_in' }
  | { kind: 'wrong_details' }
  | { kind: 'paused'; until: Date }
  | { kind: 'email_not_confirmed' }
  | { kind: 'too_many_attempts' }
  // Supabase's own ban, set by a moderator (S1-E10-06).
  | { kind: 'banned' };

/** Supabase Auth's codes for "slow down". */
const rateLimitCodes = new Set(['over_request_rate_limit', 'over_email_send_rate_limit']);

/**
 * Says whether an Auth error means Supabase couldn't be reached at all (no answer, or a network
 * failure, which supabase-js reports with status 0).
 *
 * @param error - the error's HTTP status, if any
 * @returns true when there was no real answer
 */
function isUnreachable(error: { status?: number }): boolean {
  return error.status === undefined || error.status === 0;
}

/**
 * Reads a pause end from the database's answer.
 *
 * @param answer - a timestamp text, or null
 * @returns the time, or null when there is no pause
 */
function toPauseEnd(answer: unknown): Date | null {
  return typeof answer === 'string' ? new Date(answer) : null;
}

/**
 * Notes a wrong try and says whether logging in is now paused.
 *
 * @param client - the shared Supabase client
 * @param emailHash - the email's hash
 * @returns the answer to show
 */
async function recordWrongTry(client: AppSupabaseClient, emailHash: string): Promise<SignInResult> {
  const { data, error } = await client.rpc('record_sign_in_failure', { email_hash: emailHash });
  if (error !== null) throw new Error(`Could not note the wrong try: ${error.message}`);
  const until = toPauseEnd(data);
  return until === null ? { kind: 'wrong_details' } : { kind: 'paused', until };
}

/**
 * Turns Supabase Auth's other refusals into an answer.
 *
 * @param code - Supabase Auth's error code, if any
 * @param message - its message, for the error thrown when the code is unexpected
 * @returns the answer to show
 * Errors: throws for anything unexpected, so the screen says the server couldn't be reached.
 */
function refusalFromCode(code: string | undefined, message: string): SignInResult {
  if (code === 'email_not_confirmed') return { kind: 'email_not_confirmed' };
  if (code === 'user_banned') return { kind: 'banned' };
  if (rateLimitCodes.has(code ?? '')) return { kind: 'too_many_attempts' };
  throw new Error(`Could not log in: ${code ?? message}`);
}

/**
 * Logs in with an email and a password.
 *
 * @param client - the shared Supabase client
 * @param email - as typed
 * @param password - as typed
 * @returns signed_in, or why not
 * Errors: throws when Supabase can't be reached.
 */
export async function signInWithPassword(
  client: AppSupabaseClient,
  email: string,
  password: string,
): Promise<SignInResult> {
  // Step 1: a running pause stops the try before it reaches Supabase Auth.
  const emailHash = await hashEmail(email);
  const pause = await client.rpc('sign_in_pause_until', { email_hash: emailHash });
  if (pause.error !== null) throw new Error(`Could not check the pause: ${pause.error.message}`);
  const pausedUntil = toPauseEnd(pause.data);
  if (pausedUntil !== null) return { kind: 'paused', until: pausedUntil };

  // Step 2: the try itself.
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error?.code === 'invalid_credentials') return recordWrongTry(client, emailHash);
  if (error !== null) return refusalFromCode(error.code, error.message);

  // Step 3: logged in, so the wrong tries are forgotten.
  await client.rpc('clear_my_sign_in_failures');
  return { kind: 'signed_in' };
}

/**
 * Emails a log-in link ("Email me a log-in link"). It never makes an account.
 *
 * @param client - the shared Supabase client
 * @param email - as typed
 * @returns 'sent' (also when there is no account, so nothing is revealed) or 'too_many_attempts'
 * Errors: throws when Supabase can't be reached.
 */
export async function sendLogInLink(
  client: AppSupabaseClient,
  email: string,
): Promise<'sent' | 'too_many_attempts'> {
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false },
  });
  if (error !== null && rateLimitCodes.has(error.code ?? '')) return 'too_many_attempts';
  // Any other refusal (for example no such account) looks the same as success on screen.
  if (error !== null && isUnreachable(error)) throw new Error('Could not reach Supabase.');
  return 'sent';
}

/**
 * Emails a link to choose a new password ("Send reset link").
 *
 * @param client - the shared Supabase client
 * @param email - as typed
 * @returns 'sent' (whether or not there is an account) or 'too_many_attempts'
 * Errors: throws when Supabase can't be reached.
 */
export async function sendResetLink(
  client: AppSupabaseClient,
  email: string,
): Promise<'sent' | 'too_many_attempts'> {
  const { error } = await client.auth.resetPasswordForEmail(email.trim());
  if (error !== null && rateLimitCodes.has(error.code ?? '')) return 'too_many_attempts';
  if (error !== null && isUnreachable(error)) throw new Error('Could not reach Supabase.');
  return 'sent';
}

/**
 * Opens a reset link (/reset-password?token_hash=…&type=recovery): Supabase signs the person in
 * for long enough to choose a new password.
 *
 * @param client - the shared Supabase client
 * @param tokenHash - the token from the link
 * @returns true when the link worked; false when it expired or was used
 */
export async function openResetLink(
  client: AppSupabaseClient,
  tokenHash: string,
): Promise<boolean> {
  const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
  return error === null;
}

/**
 * Saves a new password, logs every other device out and forgets the wrong tries
 * (S1-E2-05: "all other sessions are signed out and the user gets an email"; Supabase sends the
 * "password changed" email, supabase/templates/password_changed.html).
 *
 * @param client - the shared Supabase client, signed in by openResetLink()
 * @param newPassword - already checked by the form (length, match, not leaked)
 * @returns 'saved', 'weak_password' or 'same_password'
 * Errors: throws when Supabase can't be reached or the reset session has ended.
 */
export async function saveNewPassword(
  client: AppSupabaseClient,
  newPassword: string,
): Promise<'saved' | 'weak_password' | 'same_password'> {
  const { error } = await client.auth.updateUser({ password: newPassword });
  if (error?.code === 'weak_password') return 'weak_password';
  if (error?.code === 'same_password') return 'same_password';
  if (error !== null)
    throw new Error(`Could not save the password: ${error.code ?? error.message}`);
  // Step 2: every other device is logged out, and the pause is cleared.
  await client.auth.signOut({ scope: 'others' });
  await client.rpc('clear_my_sign_in_failures');
  return 'saved';
}

/**
 * Logs this device out.
 *
 * @param client - the shared Supabase client
 * Errors: throws when Supabase can't be reached; the device keeps its session then.
 */
export async function signOutHere(client: AppSupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut({ scope: 'local' });
  if (error !== null) throw new Error(`Could not log out: ${error.code ?? error.message}`);
}

/**
 * Logs every other device out ("Sign out of all other devices").
 *
 * @param client - the shared Supabase client
 * Errors: throws when Supabase can't be reached.
 */
export async function signOutOtherDevices(client: AppSupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut({ scope: 'others' });
  if (error !== null)
    throw new Error(`Could not log out the other devices: ${error.code ?? error.message}`);
}
