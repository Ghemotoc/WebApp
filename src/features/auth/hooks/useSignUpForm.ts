/**
 * useSignUpForm: the sign-up form's answers, its checks and sending it (stories S1-E2-01, S1-E2-02).
 *
 * Who calls it: SignUpForm (src/features/auth/components/).
 * What it calls, in order, when the person presses "Create account":
 * 1. the form rules (src/schemas/signUp.ts): every field at once, so all problems show together;
 * 2. the leaked-password check (lib/passwordLeak.ts), for a password sign-up;
 * 3. api/signUp.ts → Supabase Auth → the sign-up trigger, which checks everything again.
 * Before any of that, the age rules (src/lib/age.ts): a year that makes the person under 13, or
 * under 18 while adults_only is on, or under their country's minimum age (16 in Australia,
 * S1-E2-10), is refused; every answer is cleared and nothing is sent ("We don't keep anything you
 * typed", S1-E2-02).
 * What it returns: the answers and a setter per field, the problems to show (translation keys),
 * the age outcome, whether it is sending, a failure or refusal, and the email the link went to.
 */
import { useState } from 'react';

import {
  isUnderMarketAge,
  romanianToday,
  signUpAgeOutcome,
  type SignUpAgeOutcome,
} from '@/lib/age';
import { getSupabaseClient } from '@/lib/supabase';
import { findSignUpProblems, type SignUpAnswers, type SignUpProblems } from '@/schemas/signUp';

import { signUp, SignUpError, type SignUpContext, type SignUpFailure } from '../api/signUp';
import { checkPasswordLeak } from '../lib/passwordLeak';

/** What the form holds before it is checked: the box may still be unticked. */
export type SignUpDraft = Omit<SignUpAnswers, 'acceptsTerms'> & { acceptsTerms: boolean };

/** An empty form, with a password chosen by default (as on the board). */
const emptyDraft: SignUpDraft = {
  method: 'password',
  email: '',
  password: '',
  confirmPassword: '',
  birthYear: '',
  birthMonth: '',
  acceptsTerms: false,
};

/** The age outcomes that end sign-up; under_market_age is the country's own minimum (S1-E2-10). */
export type AgeRefusalReason =
  Extract<SignUpAgeOutcome, 'under_13' | 'adults_only'> | 'under_market_age';

/**
 * Which refusal, if any, applies before anything is sent.
 *
 * @param ageOutcome - the age rules' answer
 * @param answers - the form's answers
 * @param marketMinimumAge - the visitor's market's minimum age
 * @returns the reason, or null when the form may be sent
 */
function refusalBeforeSending(
  ageOutcome: SignUpAgeOutcome,
  answers: SignUpDraft,
  marketMinimumAge: number,
): AgeRefusalReason | null {
  if (ageOutcome === 'under_13' || ageOutcome === 'adults_only') return ageOutcome;
  if (ageOutcome !== 'ok') return null;
  const month = answers.birthMonth === '' ? null : Number(answers.birthMonth);
  const isTooYoung = isUnderMarketAge(
    Number(answers.birthYear),
    month,
    marketMinimumAge,
    romanianToday(),
  );
  return isTooYoung ? 'under_market_age' : null;
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
  // Step 1: the form rules.
  const problems = findSignUpProblems(draft);
  if (Object.keys(problems).length > 0) return problems;
  // Step 2: a leaked password is refused here; if the check can't be reached, sign-up goes on.
  if (draft.method === 'password' && (await checkPasswordLeak(draft.password)) === 'leaked') {
    return { password: 'signUp.errors.passwordLeaked' };
  }
  // Step 3: Supabase Auth and the sign-up trigger.
  const client = await getSupabaseClient();
  if (client === null) throw new SignUpError('unreachable');
  await signUp(client, draft as SignUpAnswers, context);
  return null;
}

/**
 * The form's state and actions.
 *
 * @param context - the invite, the legal versions and the language, or null while they load
 * @param isAdultsOnly - the adults_only flag (on in March)
 * @returns answers, setField, problems, ageOutcome, submit, isSending, failure, refusedFor, sentTo
 */
export function useSignUpForm(context: SignUpContext | null, isAdultsOnly: boolean) {
  const [answers, setAnswers] = useState<SignUpDraft>(emptyDraft);
  const [problems, setProblems] = useState<SignUpProblems>({});
  const [isSending, setIsSending] = useState(false);
  const [failure, setFailure] = useState<SignUpFailure | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [refusedFor, setRefusedFor] = useState<AgeRefusalReason | null>(null);
  const ageOutcome = ageOutcomeOf(answers, isAdultsOnly);

  /** Changes one answer and clears that field's problem. */
  function setField<Field extends keyof SignUpDraft>(field: Field, value: SignUpDraft[Field]) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setProblems((current) => ({ ...current, [field]: undefined }));
  }

  /** Checks and sends the form; shows problems or the "check your email" step. */
  async function submit() {
    if (context === null || isSending) return;
    // The age rules first, the market's own minimum age included: a refusal clears every answer
    // and sends nothing.
    const refusal = refusalBeforeSending(ageOutcome, answers, context.marketMinimumAge);
    if (refusal !== null) {
      setAnswers(emptyDraft);
      setRefusedFor(refusal);
      return;
    }
    setIsSending(true);
    setFailure(null);
    try {
      const found = await sendSignUp(answers, context);
      if (found === null) setSentTo(answers.email);
      else setProblems(found);
    } catch (error) {
      setFailure(error instanceof SignUpError ? error.failure : 'unreachable');
    } finally {
      setIsSending(false);
    }
  }

  return {
    answers,
    setField,
    problems,
    ageOutcome,
    submit,
    isSending,
    failure,
    refusedFor,
    sentTo,
  };
}
