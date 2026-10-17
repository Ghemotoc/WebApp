/**
 * useSignUpForm: the sign-up form's answers, its checks and sending it (story S1-E2-01).
 *
 * Who calls it: SignUpForm (src/features/auth/components/).
 * What it calls, in order, when the person presses "Create account":
 * 1. the form rules (src/schemas/signUp.ts): every field at once, so all problems show together;
 * 2. the leaked-password check (lib/passwordLeak.ts), for a password sign-up;
 * 3. api/signUp.ts → Supabase Auth → the sign-up trigger, which checks everything again.
 * What it returns: the answers and a setter per field, the problems to show (translation keys),
 * whether it is sending, a failure reason, and the email the link went to once it has.
 */
import { useState } from 'react';

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
  acceptsTerms: false,
};

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
 * @returns answers, setField, problems, submit, isSending, failure and sentTo
 */
export function useSignUpForm(context: SignUpContext | null) {
  const [answers, setAnswers] = useState<SignUpDraft>(emptyDraft);
  const [problems, setProblems] = useState<SignUpProblems>({});
  const [isSending, setIsSending] = useState(false);
  const [failure, setFailure] = useState<SignUpFailure | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  /** Changes one answer and clears that field's problem. */
  function setField<Field extends keyof SignUpDraft>(field: Field, value: SignUpDraft[Field]) {
    setAnswers((current) => ({ ...current, [field]: value }));
    setProblems((current) => ({ ...current, [field]: undefined }));
  }

  /** Checks and sends the form; shows problems or the "check your email" step. */
  async function submit() {
    if (context === null || isSending) return;
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

  return { answers, setField, problems, submit, isSending, failure, sentTo };
}
