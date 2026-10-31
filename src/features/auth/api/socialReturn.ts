/**
 * What happens when Google, Apple or Microsoft send the person back to /auth/social-return
 * (story S1-E2-09).
 *
 * Who calls it: components/SocialReturnPage.tsx, once per visit.
 * What it calls next: Supabase Auth (the session the provider's redirect made) and
 * api/socialSignIn.ts: finishSocialSignUp() with the answers kept by the sign-up form, or
 * cancelSocialSignUp() for a provider account nobody finished.
 * The cases, in order:
 * 1. the provider or Supabase Auth sent an error back: say why (a provider can't join an account
 *    that is already set up unless connected from Settings, criterion 5);
 * 2. connecting from Settings (mode=link): back to Settings › Ways to log in;
 * 3. not signed in: something went wrong on the way;
 * 4. the sign-up form kept answers: finish the sign-up, or cancel it when a rule refuses;
 * 5. no answers: an ordinary log-in, or someone who never joined, whose account is cancelled.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import {
  cancelSocialSignUp,
  finishSocialSignUp,
  takeKeptAnswers,
  type SocialSignUpRule,
} from './socialSignIn';

/** What the return page says when it doesn't move on. */
export type SocialReturnMessage =
  'alreadyHasAccount' | 'linkTaken' | 'cancelled' | 'notJoined' | 'failed';

/** What the return page does: go somewhere, or say something. */
export type SocialReturnOutcome =
  | { kind: 'go'; to: string }
  | { kind: 'say'; message: SocialReturnMessage }
  | { kind: 'refused'; rule: SocialSignUpRule };

/** What the address said when the person came back, read before Supabase tidies it. */
export interface SocialReturnAddress {
  /** 'link' when connecting from Settings. */
  mode: string | null;
  /** The error code from the provider or Supabase Auth, if any. */
  errorCode: string | null;
  /** Its description, which carries the database's reason when a trigger refused. */
  errorDescription: string | null;
}

/**
 * Reads the mode and any error from the address: Supabase puts errors in the query or after #.
 *
 * @param location - window.location, or a test's stand-in
 * @returns the parts the page needs
 */
export function readSocialReturnAddress(location: {
  search: string;
  hash: string;
}): SocialReturnAddress {
  const query = new URLSearchParams(location.search);
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
  const either = (name: string) => query.get(name) ?? fragment.get(name);
  return {
    mode: query.get('mode'),
    errorCode: either('error_code') ?? either('error'),
    errorDescription: either('error_description'),
  };
}

/**
 * Turns an error from the way back into the message to show (case 1).
 *
 * @param address - the parts of the address
 * @returns the message
 */
export function messageForError(address: SocialReturnAddress): SocialReturnMessage {
  // guard_identity_link() refused: the email has an account set up already.
  if (address.errorDescription?.includes('identity_link_not_requested') === true) {
    return 'alreadyHasAccount';
  }
  // Connecting a provider account that already belongs to someone else.
  if (address.errorCode === 'identity_already_exists') return 'linkTaken';
  // The person pressed Cancel at the provider.
  if (address.errorCode === 'access_denied') return 'cancelled';
  return 'failed';
}

/**
 * Finishes a sign-up with the kept answers (case 4); a refusal keeps nothing.
 *
 * @param client - the shared Supabase client, signed in
 * @param keptAnswers - from takeKeptAnswers()
 * @returns home, or the rule that refused
 */
async function finishWithAnswers(
  client: AppSupabaseClient,
  keptAnswers: Parameters<typeof finishSocialSignUp>[1],
): Promise<SocialReturnOutcome> {
  const finished = await finishSocialSignUp(client, keptAnswers);
  if (finished.outcome !== 'refused') return { kind: 'go', to: '/' };
  await cancelSocialSignUp(client);
  return { kind: 'refused', rule: finished.rule };
}

/**
 * Decides what the return page does (the cases above).
 *
 * @param client - the shared Supabase client
 * @param address - from readSocialReturnAddress()
 * @returns where to go, or what to say
 * Errors: throws when Supabase or the database can't be reached; the page then says it failed.
 */
export async function settleSocialReturn(
  client: AppSupabaseClient,
  address: SocialReturnAddress,
): Promise<SocialReturnOutcome> {
  // Case 1: an error on the way back. Kept answers are dropped so they are never reused.
  if (address.errorCode !== null || address.errorDescription !== null) {
    takeKeptAnswers();
    return { kind: 'say', message: messageForError(address) };
  }
  // Case 2: a provider connected from Settings.
  if (address.mode === 'link') return { kind: 'go', to: '/settings#ways-to-log-in' };
  // Case 3: no session means the provider's answer never reached Supabase.
  const { data } = await client.auth.getSession();
  if (data.session === null) return { kind: 'say', message: 'failed' };
  // Case 4: a sign-up started on the form.
  const keptAnswers = takeKeptAnswers();
  if (keptAnswers !== null) return finishWithAnswers(client, keptAnswers);
  // Case 5: a log-in. An account that was never set up is removed, and the person is asked to join.
  const cancelled = await cancelSocialSignUp(client);
  return cancelled === 'already_set_up'
    ? { kind: 'go', to: '/' }
    : { kind: 'say', message: 'notJoined' };
}
