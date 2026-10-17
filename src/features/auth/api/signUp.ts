/**
 * Creates an account with Supabase Auth (story S1-E2-01).
 *
 * Who calls it: hooks/useSignUp.ts.
 * What it calls next: Supabase Auth. A password sign-up uses signUp(); "Email me a log-in link
 * instead" uses signInWithOtp(), which makes the account on first use. Both send the same sign-up
 * data, which the trigger in supabase/migrations/…_s1_e2_01_sign_up_trigger.sql checks before the
 * account exists: the invite, the year of birth, the accepted legal versions and the language.
 * Either way Supabase emails a link (supabase/templates/), and the account can read but not write
 * until the email is confirmed.
 * Privacy: nothing here is logged (CLAUDE.md rule 12); errors carry Supabase's error code only.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import type { SignUpAnswers } from '@/schemas/signUp';

/** What else the sign-up sends, besides the person's answers. */
export interface SignUpContext {
  /** The invite code, while invite_only is on; null otherwise. */
  inviteCode: string | null;
  /** The IDs of the terms and privacy notice versions the form showed. */
  termsVersionId: string;
  privacyVersionId: string;
  /** The interface language, kept on the account and used for its emails. */
  locale: string;
}

/** Why a sign-up didn't work, in words the form can turn into a message. */
export type SignUpFailure = 'refused' | 'weak_password' | 'too_many_attempts' | 'unreachable';

/** The error a failed sign-up throws, with the reason. */
export class SignUpError extends Error {
  constructor(public readonly failure: SignUpFailure) {
    super(`Sign-up failed: ${failure}`);
  }
}

/**
 * Maps Supabase's error code to a reason the form explains.
 *
 * @param code - Supabase Auth's error code, if any
 * @returns the reason
 */
export function signUpFailureFromCode(code: string | undefined): SignUpFailure {
  if (code === 'weak_password') return 'weak_password';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit')
    return 'too_many_attempts';
  // "Database error saving new user" (unexpected_failure): the trigger refused the sign-up.
  if (code === 'unexpected_failure') return 'refused';
  return code === undefined ? 'unreachable' : 'refused';
}

/**
 * Signs a new person up.
 *
 * @param client - the shared Supabase client
 * @param answers - the checked form answers
 * @param context - the invite, the legal versions and the language
 * Errors: throws SignUpError with the reason; Supabase gives no other detail, by design, so a
 *   sign-up can't be used to find out whether an email already has an account.
 */
export async function signUp(
  client: AppSupabaseClient,
  answers: SignUpAnswers,
  context: SignUpContext,
): Promise<void> {
  // Step 1: the data the sign-up trigger checks.
  const data = {
    birth_year: answers.birthYear,
    invite_code: context.inviteCode,
    accepted_terms_version_id: context.termsVersionId,
    accepted_privacy_version_id: context.privacyVersionId,
    locale: context.locale,
  };
  // Step 2: a password, or a link emailed each time.
  const { error } =
    answers.method === 'password'
      ? await client.auth.signUp({
          email: answers.email,
          password: answers.password,
          options: { data },
        })
      : await client.auth.signInWithOtp({
          email: answers.email,
          options: { data, shouldCreateUser: true },
        });
  if (error !== null) throw new SignUpError(signUpFailureFromCode(error.code));
}

/**
 * Sends the confirmation email again ("Send the link again").
 *
 * @param client - the shared Supabase client
 * @param email - the address signed up with
 * Errors: throws SignUpError('too_many_attempts') when Supabase's limit is reached, else 'unreachable'.
 */
export async function resendConfirmation(client: AppSupabaseClient, email: string): Promise<void> {
  const { error } = await client.auth.resend({ type: 'signup', email });
  if (error !== null)
    throw new SignUpError(
      signUpFailureFromCode(error.code) === 'too_many_attempts'
        ? 'too_many_attempts'
        : 'unreachable',
    );
}

/**
 * Confirms an email from the link in the email (/auth/confirm?token_hash=…&type=email). Supabase
 * signs the person in on this device when it works.
 *
 * @param client - the shared Supabase client
 * @param tokenHash - the token from the link
 * @returns true when the email is confirmed; false when the link has expired or was already used
 */
export async function confirmEmail(client: AppSupabaseClient, tokenHash: string): Promise<boolean> {
  const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
  return error === null;
}
