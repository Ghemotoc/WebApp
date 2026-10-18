/**
 * useNewPasswordForm: choosing a new password after a reset link (story S1-E2-05).
 *
 * Who calls it: NewPasswordForm. What it calls: the same rules as sign-up (at least 10
 * characters, typed twice, not on a list of leaked passwords: lib/passwordLeak.ts, ADR 0003), then
 * api/signIn.ts → saveNewPassword(), which also logs every other device out.
 */
import { useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase';
import { minimumPasswordLength } from '@/schemas/signUp';

import { saveNewPassword } from '../api/signIn';
import { checkPasswordLeak } from '../lib/passwordLeak';

/** A problem the form shows, as a translation key in the auth namespace. */
export type NewPasswordProblem =
  | 'signUp.errors.passwordTooShort'
  | 'signUp.errors.passwordsDiffer'
  | 'signUp.errors.passwordLeaked'
  | 'signUp.errors.weakPassword'
  | 'reset.samePassword'
  | 'signIn.unreachable';

/**
 * Checks the two fields before anything is sent.
 *
 * @param password - the new password
 * @param confirmPassword - the second copy
 * @returns the first problem, or null
 */
function localProblem(password: string, confirmPassword: string): NewPasswordProblem | null {
  if (password.length < minimumPasswordLength) return 'signUp.errors.passwordTooShort';
  if (password !== confirmPassword) return 'signUp.errors.passwordsDiffer';
  return null;
}

/**
 * Holds the form.
 *
 * @returns the fields, the problem, whether it is saving or saved, and save()
 */
export function useNewPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [problem, setProblem] = useState<NewPasswordProblem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  /** Checks, then saves. A leak check that can't be reached doesn't block (as at sign-up). */
  async function save() {
    const firstProblem = localProblem(password, confirmPassword);
    setProblem(firstProblem);
    if (firstProblem !== null) return;
    setIsSaving(true);
    try {
      if ((await checkPasswordLeak(password)) === 'leaked')
        return setProblem('signUp.errors.passwordLeaked');
      const client = await getSupabaseClient();
      if (client === null) return setProblem('signIn.unreachable');
      const outcome = await saveNewPassword(client, password);
      if (outcome === 'weak_password') return setProblem('signUp.errors.weakPassword');
      if (outcome === 'same_password') return setProblem('reset.samePassword');
      setIsSaved(true);
    } catch {
      setProblem('signIn.unreachable');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    problem,
    isSaving,
    isSaved,
    save,
  };
}
