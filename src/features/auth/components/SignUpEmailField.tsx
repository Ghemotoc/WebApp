/**
 * SignUpEmailField: the email field at the top of the sign-up form, board 2.1 (story S1-E2-01).
 *
 * Split out of SignUpForm (WAITLIST-1) so the form stays within the readable-code limits once
 * the waiting list's question joined it. It behaves exactly as before: the label, the hint, the
 * problem from the form's checks and the browser's email autofill.
 * Who uses it: SignUpForm.
 * What it calls: nothing; the answer goes into the form's state (useSignUpForm).
 */
import { useTranslation } from 'react-i18next';

import { TextInput } from '@/components/ui/TextInput';

import type { useSignUpForm } from '../hooks/useSignUpForm';

/**
 * Renders the email field.
 *
 * @param props.form - the sign-up form's state
 * @returns the labelled email input with its hint and any problem
 */
export function SignUpEmailField({ form }: { form: ReturnType<typeof useSignUpForm> }) {
  const { t } = useTranslation('auth');
  const { answers, setField, problems } = form;
  return (
    <TextInput
      id="sign-up-email"
      type="email"
      autoComplete="email"
      label={t('signUp.email.label')}
      hint={t('signUp.email.hint')}
      errorMessage={problems.email === undefined ? undefined : t(problems.email)}
      value={answers.email}
      onChange={(event) => setField('email', event.target.value)}
    />
  );
}
