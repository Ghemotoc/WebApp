/**
 * useSignUpForm: the sign-up form's answers, its checks and sending it (stories S1-E2-01, S1-E2-02).
 *
 * Who calls it: SignUpForm (src/features/auth/components/).
 * What it calls, in order, when the person presses "Create account":
 * 1. the form rules (src/schemas/signUp.ts): every field at once, so all problems show together;
 * 2. the leaked-password check (lib/passwordLeak.ts), for a password sign-up;
 * 3. api/signUp.ts → Supabase Auth → the sign-up trigger, which checks everything again.
 * Before any of that, the age rules (src/lib/age.ts, src/lib/age-rules.ts): a year that makes the
 * person under 13, or under 18 while adults_only is on, or too young for the country they chose
 * (blocked under 16 in Australia, MARKETS-1), is refused; every answer is cleared and nothing is
 * sent ("We don't keep anything you typed", S1-E2-02).
 * The country picker starts on the country of the connection; the person's own choice wins.
 * "Continue with Google" (or Apple or Microsoft, S1-E2-09) runs the same checks except the email
 * and password, then leaves for the provider (api/socialSignIn.ts); the return page finishes it.
 * What it returns: the answers and a setter per field, the problems to show (translation keys),
 * the age outcome, whether it is sending, a failure or refusal, and the email the link went to.
 */
import { useState } from 'react';

import { romanianToday, signUpAgeOutcome, type SignUpAgeOutcome } from '@/lib/age';
import { ageRuleOutcome, joiningAge, ruleFor, type AgeRule } from '@/lib/age-rules';
import { checkHandle } from '@/features/account/api/accountNames';
import type { HandleOutcome } from '@/features/account/lib/nameRules';
import { getSupabaseClient, type AppSupabaseClient } from '@/lib/supabase';
import { findSignUpProblems, type SignUpAnswers, type SignUpProblems } from '@/schemas/signUp';
import { trackEvent } from '@/lib/analytics/track';

import { signUp, SignUpError, type SignUpContext, type SignUpFailure } from '../api/signUp';
import { startSocialSignUp, type SocialProvider } from '../api/socialSignIn';
import { checkPasswordLeak } from '../lib/passwordLeak';

/** What the form holds before it is checked: the box may still be unticked. */
export type SignUpDraft = Omit<SignUpAnswers, 'acceptsTerms'> & { acceptsTerms: boolean };

/** An empty form, with a password chosen by default (as on the board). */
const emptyDraft: SignUpDraft = {
  method: 'password',
  email: '',
  handle: '',
  password: '',
  confirmPassword: '',
  birthYear: '',
  birthMonth: '',
  // '' until the person picks one: the country of the connection shows in its place.
  country: '',
  legalRegion: '',
  acceptsTerms: false,
};

/** The age outcomes that end sign-up; under_market_age is the chosen country's own (MARKETS-1). */
export type AgeRefusalReason =
  Extract<SignUpAgeOutcome, 'under_13' | 'adults_only'> | 'under_market_age';

/** A refusal, with the country and age its message names (they outlive the cleared form). */
export interface SignUpRefusal {
  reason: AgeRefusalReason;
  country: string | null;
  /** The age below which nobody may join in that country (16 in Australia). */
  age: number;
}

/**
 * The draft with the country of the connection in place of a country not chosen yet.
 *
 * @param draft - the form's answers
 * @param hintCountry - the country of the connection, or null
 * @returns the answers as they would be sent
 */
export function withCountryHint(draft: SignUpDraft, hintCountry: string | null): SignUpDraft {
  return draft.country === '' ? { ...draft, country: hintCountry ?? '' } : draft;
}

/**
 * Which refusal, if any, applies before anything is sent.
 *
 * @param ageOutcome - the product's own age rules' answer
 * @param answers - the form's answers, with the country filled in
 * @param ageRules - the age rules by country
 * @returns the refusal, or null when the form may be sent
 */
function refusalBeforeSending(
  ageOutcome: SignUpAgeOutcome,
  answers: SignUpDraft,
  ageRules: readonly AgeRule[],
): SignUpRefusal | null {
  const country = answers.country === '' ? null : answers.country;
  if (ageOutcome === 'under_13' || ageOutcome === 'adults_only') {
    return { reason: ageOutcome, country, age: 13 };
  }
  if (ageOutcome !== 'ok') return null;
  // The chosen country's own ages (MARKETS-1, S1-E2-22): blocked or under its minimum.
  const rule = ruleFor(ageRules, country, answers.legalRegion);
  const month = answers.birthMonth === '' ? null : Number(answers.birthMonth);
  const outcome = ageRuleOutcome(rule, Number(answers.birthYear), month, romanianToday());
  if (rule === undefined || (outcome !== 'blocked' && outcome !== 'under_minimum')) return null;
  return { reason: 'under_market_age', country, age: joiningAge(rule) };
}

/**
 * What the age rules say about the year and month chosen so far.
 *
 * @param answers - the form's answers
 * @param isAdultsOnly - the adults_only flag
 * @returns the outcome (see src/lib/age.ts)
 */
function ageOutcomeOf(answers: SignUpDraft, isAdultsOnly: boolean): SignUpAgeOutcome {
  const year = answers.birthYear === '' ? null : Number(answers.birthYear);
  const month = answers.birthMonth === '' ? null : Number(answers.birthMonth);
  return signUpAgeOutcome(year, month, isAdultsOnly, romanianToday());
}

/**
 * Asks check_handle() about the username before sending. If the check can't be reached, the
 * sign-up goes on: the trigger checks again and refuses a username it doesn't allow.
 *
 * @param client - the shared Supabase client
 * @param handle - the username as typed
 * @returns 'ok', or the database's reason
 */
async function handleOutcomeBeforeSending(
  client: AppSupabaseClient,
  handle: string,
): Promise<HandleOutcome> {
  try {
    return await checkHandle(client, handle);
  } catch {
    return 'ok';
  }
}

/**
 * Sends the answers once they pass every check in the browser.
 *
 * @param draft - the form's answers
 * @param context - the invite, legal versions and language
 * @returns problems to show, or null when the sign-up went through
 */
async function sendSignUp(
  draft: SignUpDraft,
  context: SignUpContext,
): Promise<SignUpProblems | null> {
  // Step 1: the form rules, the chosen country's month rule included.
  const problems = findSignUpProblems(draft, context.ageRules);
  if (Object.keys(problems).length > 0) return problems;
  // Step 2: a leaked password is refused here; if the check can't be reached, sign-up goes on.
  if (draft.method === 'password' && (await checkPasswordLeak(draft.password)) === 'leaked') {
    return { password: 'signUp.errors.passwordLeaked' };
  }
  // Step 3: the username's full check (taken, look-alikes, listed words), so a refusal shows
  // under the field instead of as a failed sign-up.
  const client = await getSupabaseClient();
  if (client === null) throw new SignUpError('unreachable');
  const handleOutcome = await handleOutcomeBeforeSending(client, draft.handle);
  if (handleOutcome !== 'ok') return { handle: handleOutcome };
  // Step 4: Supabase Auth and the sign-up trigger, which checks the username again.
  await signUp(client, draft as SignUpAnswers, context);
  // No properties: never who signed up (docs/analytics-events.md).
  trackEvent('sign_up_completed', {});
  return null;
}

/** An address that passes the email rule, for a provider sign-up, which has no email field. */
const providerEmailStandIn = 'provider.sign-up@example.com';

/**
 * Checks the answers a provider sign-up sends (everything but the email and password), then
 * leaves for the provider (S1-E2-09). The database checks them all again when the person is back.
 *
 * @param draft - the form's answers
 * @param context - the invite, legal versions and language
 * @param provider - Google, Apple or Microsoft
 * @returns problems to show, or null once the browser is on its way to the provider
 */
async function sendSocialSignUp(
  draft: SignUpDraft,
  context: SignUpContext,
  provider: SocialProvider,
): Promise<SignUpProblems | null> {
  // Step 1: the form rules, as for an emailed link, so no password is asked for.
  const problems = findSignUpProblems(
    { ...draft, method: 'link', email: providerEmailStandIn },
    context.ageRules,
  );
  if (Object.keys(problems).length > 0) return problems;
  // Step 2: the username's full check, so a refusal shows under the field before leaving.
  const client = await getSupabaseClient();
  if (client === null) throw new SignUpError('unreachable');
  const handleOutcome = await handleOutcomeBeforeSending(client, draft.handle);
  if (handleOutcome !== 'ok') return { handle: handleOutcome };
  // Step 3: keep the answers in this tab and go to the provider.
  await startSocialSignUp(client, provider, draft, context);
  return null;
}

/** One way of sending the answers, given the loaded context: the problems found, or null. */
type SendAnswers = (loaded: SignUpContext) => Promise<SignUpProblems | null>;

/**
 * The form's state and actions.
 *
 * @param context - the invite, the legal versions and the language, or null while they load
 * @param isAdultsOnly - the adults_only flag (on in March)
 * @returns answers (with the country of the connection until one is chosen), setField, the age
 *   rule of the chosen country, all the rules, problems, ageOutcome, submit, continueWith, isSending, failure,
 *   refusal and sentTo
 */
export function useSignUpForm(context: SignUpContext | null, isAdultsOnly: boolean) {
  const [draft, setAnswers] = useState<SignUpDraft>(emptyDraft);
  const answers = withCountryHint(draft, context?.country ?? null);
  const ageRule = ruleFor(context?.ageRules ?? [], answers.country || null, answers.legalRegion);
  const [problems, setProblems] = useState<SignUpProblems>({});
  const [isSending, setIsSending] = useState(false);
  const [failure, setFailure] = useState<SignUpFailure | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<SignUpRefusal | null>(null);
  const ageOutcome = ageOutcomeOf(answers, isAdultsOnly);

  /** Changes one answer and clears that field's problem. */
  function setField<Field extends keyof SignUpDraft>(field: Field, value: SignUpDraft[Field]) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setProblems((current) => ({ ...current, [field]: undefined }));
  }

  /**
   * Runs the age rules, then one way of sending; shows the problems, or calls onSent.
   *
   * @param send - sends the answers with the loaded context and returns the problems found, or null
   * @param onSent - what happens once they went through
   */
  async function checkThenSend(send: SendAnswers, onSent: () => void) {
    if (context === null || isSending) return;
    // The age rules first, the chosen country's own ages included: a refusal clears every answer
    // and sends nothing.
    const tooYoung = refusalBeforeSending(ageOutcome, answers, context.ageRules);
    if (tooYoung !== null) {
      setAnswers(emptyDraft);
      setRefusal(tooYoung);
      return;
    }
    setIsSending(true);
    setFailure(null);
    try {
      const found = await send(context);
      if (found === null) onSent();
      else setProblems(found);
    } catch (error) {
      setFailure(error instanceof SignUpError ? error.failure : 'unreachable');
    } finally {
      setIsSending(false);
    }
  }

  /** Checks and sends the form; shows problems or the "check your email" step. */
  const submit = () =>
    checkThenSend(
      (loaded) => sendSignUp(answers, loaded),
      () => setSentTo(answers.email),
    );

  /** "Continue with …": checks the answers and leaves for the provider (S1-E2-09). */
  const continueWith = (provider: SocialProvider) =>
    // Nothing happens once sent: the browser is already leaving for the provider.
    checkThenSend(
      (loaded) => sendSocialSignUp(answers, loaded, provider),
      () => undefined,
    );

  return {
    answers,
    setField,
    ageRule,
    ageRules: context?.ageRules ?? [],
    problems,
    ageOutcome,
    submit,
    continueWith,
    isSending,
    failure,
    refusal,
    sentTo,
  };
}
