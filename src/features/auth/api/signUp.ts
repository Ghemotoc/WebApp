/**
 * Creates an account with Supabase Auth (story S1-E2-01).
 *
 * Who calls it: hooks/useSignUp.ts.
 * What it calls next: Supabase Auth. A password sign-up uses signUp(); "Email me a log-in link
 * instead" uses signInWithOtp(), which makes the account on first use. Both send the same sign-up
 * data, which the sign-up trigger (…_s1_e2_01_sign_up_trigger.sql, updated by …_s1_e2_02_birth_checks.sql)
 * checks before the account exists: the invite, the year (and month) of birth, the accepted legal
 * versions, the language, the country the person chose and the signed country of the connection
 * (S1-E2-10, MARKETS-1) and the username (S1-E2-04, chosen on the
 * form since 25 Oct 2026).
 * Either way Supabase emails a link (supabase/templates/), and the account can read but not write
 * until the email is confirmed.
 * Privacy: nothing here is logged (CLAUDE.md rule 12); errors carry Supabase's error code only.
 */
import type { AgeRule } from '@/lib/age-rules';
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
  /** The signed country token from /api/signup-context, or null when unknown (S1-E2-10). */
  signupToken: string | null;
  /** The signed scrambled IP token from /api/signup-context, or null (bundle ADMIN-2, part f2). */
  signupIpToken: string | null;
  /**
   * The country of the connection, the first answer in the country picker (MARKETS-1); the person
   * may choose another, and the database reads their choice.
   */
  country: string | null;
  /** The age rules by country, so the form refuses and asks for the month as the database does. */
  ageRules: AgeRule[];
  /**
   * The waiting list's switch (WAITLIST-1): while it is on, a code is optional, the form asks
   * "write, read or both" and offers news emails.
   */
  isWaitlistOn: boolean;
}

/** Why a sign-up didn't work, in words the form can turn into a message. */
export type SignUpFailure =
  'refused' | 'disposable_email' | 'weak_password' | 'too_many_attempts' | 'unreachable';

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

/** The answers the sign-up trigger (and finish_social_sign_up()) reads besides the email. */
export type SignUpDataAnswers = Pick<
  SignUpAnswers,
  | 'birthYear'
  | 'birthMonth'
  | 'handle'
  | 'country'
  | 'legalRegion'
  | 'waitlistInterest'
  | 'newsEmails'
>;

/**
 * The waiting list's part of the sign-up data (WAITLIST-1): the answer, the news opt-in, and
 * whether the person joins the list (no code while it is on), which words the confirmation email
 * as "You're on the list" (server/send-email.ts).
 *
 * @param answers - the form's answers
 * @param context - the switch and the code
 * @returns the extra data, empty while the list is off
 */
function waitlistData(answers: SignUpDataAnswers, context: SignUpContext) {
  if (!context.isWaitlistOn) return {};
  return {
    waitlist_interest: answers.waitlistInterest === '' ? null : answers.waitlistInterest,
    news_emails: answers.newsEmails ? 'true' : 'false',
    joins_waitlist: context.inviteCode === null,
  };
}

/**
 * The data the sign-up trigger checks, in the database's names. A Google, Apple or Microsoft
 * sign-up sends the same data to finish_social_sign_up() (S1-E2-09), so both run the same rules.
 *
 * @param answers - the year and month of birth, the username and the country from the form
 * @param context - the invite, the legal versions, the language and the signed country
 * @returns the data, ready for Supabase Auth or the database function
 */
export function signUpData(answers: SignUpDataAnswers, context: SignUpContext) {
  return {
    birth_year: answers.birthYear,
    // Only when the year needed it; the database ignores a month for any other year (S1-E2-02).
    birth_month: answers.birthMonth === '' ? null : answers.birthMonth,
    invite_code: context.inviteCode,
    accepted_terms_version_id: context.termsVersionId,
    accepted_privacy_version_id: context.privacyVersionId,
    locale: context.locale,
    // The username from the form; the trigger checks it with check_handle() (S1-E2-04).
    handle: answers.handle,
    // The country the person lives in, and its region with its own age law if any: their ages
    // follow it (MARKETS-1). The trigger checks both against country_age_rules.
    country: answers.country,
    legal_region: answers.legalRegion,
    // The country, signed by our Pages Function; the trigger checks it (S1-E2-10).
    signup_context: context.signupToken,
    // The scrambled IP address, signed; the trigger keeps it 30 days to spot a returning banned
    // account for a moderator, never to block anyone (bundle ADMIN-2, part f2).
    signup_ip: context.signupIpToken,
    ...waitlistData(answers, context),
  };
}

/**
 * Throws when the email's domain hands out throwaway addresses (email_domain_allowed(), from the
 * public list in content/disposable-email-domains/; Robert's brief of 2 Nov 2026, section 6).
 *
 * @param client - the shared Supabase client
 * @param email - the address typed on the form
 * Errors: throws SignUpError('disposable_email') for a throwaway domain. If the question itself
 *   fails, the sign-up goes on: the sign-up trigger asks the same question and refuses it there.
 */
async function refuseThrowawayEmail(client: AppSupabaseClient, email: string): Promise<void> {
  const { data: isAllowed, error } = await client.rpc('email_domain_allowed', { email });
  if (error === null && isAllowed === false) throw new SignUpError('disposable_email');
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
  // Step 1: a throwaway email address can't make an account (bundle ADMIN-2, part f1). Asking
  // first lets the form say so in plain words; the sign-up trigger refuses it anyway.
  await refuseThrowawayEmail(client, answers.email);
  // Step 2: the data the sign-up trigger checks.
  const data = signUpData(answers, context);
  // Step 3: a password, or a link emailed each time.
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
