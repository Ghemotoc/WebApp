/**
 * Google, Apple and Microsoft sign-up and log-in, and passkey log-in (story S1-E2-09).
 *
 * Who calls it: hooks/useSignUpForm.ts (continueWith), components/SocialLogIn.tsx and
 * components/PasskeyLogInButton.tsx on the log-in page, and components/SocialReturnPage.tsx at
 * /auth/social-return, where the provider sends the person back.
 * What it calls next: Supabase Auth (signInWithOAuth, signInWithPasskey) and three database
 * functions (…_s1_e2_09_ways_to_log_in.sql): finish_social_sign_up(), which runs the same sign-up
 * rules as a password sign-up, and cancel_social_sign_up(), which removes a provider account that
 * was never finished.
 * How a provider sign-up works:
 * 1. the sign-up form checks every answer except the email and password, and keeps them in this
 *    tab's sessionStorage (never localStorage: they leave when the tab closes);
 * 2. the person goes to the provider and comes back signed in to an account with no profile yet,
 *    which can't read or write anything (the account gate treats it as no account);
 * 3. the return page hands the kept answers to finish_social_sign_up(): a refusal cancels the
 *    account, so nothing is kept; a good answer makes the profile and records the consents.
 * Privacy: nothing here is logged (CLAUDE.md rule 12); the provider's email never reaches a screen.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';

import { signUpData, type SignUpContext, type SignUpDataAnswers } from './signUp';

/** The providers, in Supabase Auth's names: 'azure' is Microsoft (personal and work accounts). */
export type SocialProvider = 'google' | 'apple' | 'azure';

/** The providers in the order the boards show them. */
export const socialProviders: SocialProvider[] = ['google', 'apple', 'azure'];

/** Which sign-up rule refused a provider sign-up (finish_social_sign_up()'s rule). */
export type SocialSignUpRule = 'age' | 'market' | 'username' | 'invite' | 'terms' | 'other';

/** What finish_social_sign_up() answered. */
export type SocialSignUpOutcome =
  { outcome: 'ok' } | { outcome: 'finished' } | { outcome: 'refused'; rule: SocialSignUpRule };

/** The sessionStorage key for the answers kept while the person is at the provider. */
const keptAnswersKey = 'social-sign-up-answers';

/** Where every provider sends the person back. */
const returnPath = '/auth/social-return';

/**
 * The address the provider sends the person back to.
 *
 * @param mode - 'link' when connecting from Settings; nothing for a sign-up or log-in
 * @returns the full address on this site
 */
export function socialReturnAddress(mode?: 'link'): string {
  const address = new URL(returnPath, window.location.origin);
  if (mode !== undefined) address.searchParams.set('mode', mode);
  return address.toString();
}

/**
 * What each provider is asked for: only the email, never contacts or a profile picture.
 * Microsoft needs "email" asked for by name; Google and Apple send it with the default scopes.
 *
 * @param provider - the provider
 * @returns the scopes, or undefined for the default
 */
export function scopesFor(provider: SocialProvider): string | undefined {
  return provider === 'azure' ? 'email' : undefined;
}

/**
 * Keeps the sign-up answers in this tab while the person is at the provider.
 *
 * @param data - the sign-up data from signUpData()
 * Errors: throws when the browser refuses sessionStorage, so the form can say so before leaving.
 */
function keepAnswers(data: ReturnType<typeof signUpData>): void {
  window.sessionStorage.setItem(keptAnswersKey, JSON.stringify(data));
}

/**
 * Reads the kept answers once and forgets them, so they are never used twice.
 *
 * @returns the answers, or null when there are none (a log-in, or a different tab)
 */
export function takeKeptAnswers(): Json | null {
  try {
    const kept = window.sessionStorage.getItem(keptAnswersKey);
    window.sessionStorage.removeItem(keptAnswersKey);
    return kept === null ? null : (JSON.parse(kept) as Json);
  } catch {
    // A browser that blocks storage, or text that isn't JSON: treated as no answers.
    return null;
  }
}

/**
 * Starts a sign-up with a provider: keeps the answers, then leaves for the provider.
 *
 * @param client - the shared Supabase client
 * @param provider - the provider chosen
 * @param answers - the checked year, month and username
 * @param context - the invite, the legal versions, the language and the signed country
 * Errors: throws when the answers can't be kept or Supabase refuses to start.
 */
export async function startSocialSignUp(
  client: AppSupabaseClient,
  provider: SocialProvider,
  answers: SignUpDataAnswers,
  context: SignUpContext,
): Promise<void> {
  keepAnswers(signUpData(answers, context));
  await startSocialLogIn(client, provider);
}

/**
 * Leaves for the provider to log in (or, after startSocialSignUp(), to sign up).
 *
 * @param client - the shared Supabase client
 * @param provider - the provider chosen
 * Errors: throws when Supabase refuses to start, for example when the provider isn't set up.
 */
export async function startSocialLogIn(
  client: AppSupabaseClient,
  provider: SocialProvider,
): Promise<void> {
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: socialReturnAddress(), scopes: scopesFor(provider) },
  });
  if (error !== null)
    throw new Error(`Could not start ${provider}: ${error.code ?? error.message}`);
}

/**
 * Reads finish_social_sign_up()'s answer.
 *
 * @param answer - the JSON the database returned
 * @returns the outcome; anything unexpected counts as refused for another reason
 */
function toOutcome(answer: Json): SocialSignUpOutcome {
  const reply = answer as { outcome?: string; rule?: SocialSignUpRule };
  if (reply.outcome === 'ok') return { outcome: 'ok' };
  if (reply.outcome === 'finished') return { outcome: 'finished' };
  return { outcome: 'refused', rule: reply.rule ?? 'other' };
}

/**
 * Finishes a provider sign-up with the kept answers (step 3 above).
 *
 * @param client - the shared Supabase client, signed in to the provider account
 * @param keptAnswers - from takeKeptAnswers()
 * @returns ok, finished (it already was) or refused with the rule
 * Errors: throws when the database can't be reached or social_login is off.
 */
export async function finishSocialSignUp(
  client: AppSupabaseClient,
  keptAnswers: Json,
): Promise<SocialSignUpOutcome> {
  const { data, error } = await client.rpc('finish_social_sign_up', { sign_up_data: keptAnswers });
  if (error !== null) throw new Error(`Could not finish the sign-up: ${error.message}`);
  return toOutcome(data);
}

/**
 * Removes the provider account the person is signed in to, when it was never finished, and logs
 * this device out. Used after a refusal, and when someone logs in with a provider without having
 * joined.
 *
 * @param client - the shared Supabase client
 * @returns 'cancelled', or 'already_set_up' when the account has a profile (nothing is removed)
 * Errors: throws when the database can't be reached.
 */
export async function cancelSocialSignUp(
  client: AppSupabaseClient,
): Promise<'cancelled' | 'already_set_up'> {
  const { error } = await client.rpc('cancel_social_sign_up');
  // check_violation: the account is set up, so this was an ordinary log-in.
  if (error?.code === '23514') return 'already_set_up';
  if (error !== null) throw new Error(`Could not cancel the sign-up: ${error.message}`);
  // The account is gone, so its session on this device is ended too.
  await client.auth.signOut({ scope: 'local' });
  return 'cancelled';
}

/** The browser codes for a prompt the person closed (or no passkey on this device). */
const closedPromptCodes = new Set([
  'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY',
  'ERROR_CEREMONY_ABORTED',
]);

/**
 * Says whether a passkey error only means the browser's prompt was closed. The browser answers
 * "NotAllowedError" both when the person closes it and when there is no passkey here, and
 * supabase-js passes that through with its own code.
 *
 * @param error - the error from signInWithPasskey() or registerPasskey()
 * @returns true for a closed prompt
 */
export function isClosedPasskeyPrompt(error: { name: string; code?: string }): boolean {
  return error.name === 'NotAllowedError' || closedPromptCodes.has(error.code ?? '');
}

/**
 * Logs in with a passkey: the browser asks for the fingerprint, face or device PIN.
 *
 * @param client - the shared Supabase client
 * @returns 'signed_in', 'cancelled' when the person closed the browser's prompt, or 'failed'
 */
export async function signInWithPasskey(
  client: AppSupabaseClient,
): Promise<'signed_in' | 'cancelled' | 'failed'> {
  const { error } = await client.auth.signInWithPasskey();
  if (error === null) return 'signed_in';
  return isClosedPasskeyPrompt(error) ? 'cancelled' : 'failed';
}
