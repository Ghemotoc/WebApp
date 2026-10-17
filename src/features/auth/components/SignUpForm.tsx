/**
 * SignUpForm: the sign-up form, board 2.1 (story S1-E2-01).
 *
 * Fields (S1-E2-01 criterion 1): email; a password typed twice, or "Email me a log-in link
 * instead"; year of birth; and acceptance of the current terms with consent to the privacy notice.
 * The username and pen name come in setup afterwards (S1-E2-04). The Google, Apple and Microsoft
 * buttons belong to S1-E2-09 and stay hidden while the social_login flag is off.
 * What it calls: useSignUpForm (checks, the leaked-password check, Supabase Auth). Once the link
 * is sent, the parent shows CheckYourEmail instead.
 * Who uses it: SignUpPage.
 */
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { SignUpFailure } from '../api/signUp';
import type { useSignUpForm } from '../hooks/useSignUpForm';

import { PasswordFields } from './PasswordFields';
import { TermsCheckbox } from './TermsCheckbox';
import { YearOfBirthField } from './YearOfBirthField';

/** The message key for each way a sign-up can fail. */
const failureMessages: Record<SignUpFailure, string> = {
  refused: 'signUp.errors.refused',
  weak_password: 'signUp.errors.weakPassword',
  too_many_attempts: 'signUp.errors.tooManyAttempts',
  unreachable: 'signUp.errors.unreachable',
};

/** What the form needs: the state from useSignUpForm. */
interface SignUpFormProps {
  form: ReturnType<typeof useSignUpForm>;
}

/**
 * Renders the form.
 *
 * @returns the form with its fields, the failure message and the submit button
 */
export function SignUpForm({ form }: SignUpFormProps) {
  const { t } = useTranslation('auth');
  const { answers, setField, problems } = form;
  const problemText = (key: string | undefined) => (key === undefined ? undefined : t(key));

  /** Sends the form without reloading the page. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void form.submit();
  }

  return (
    <form
      aria-label={t('signUp.formLabel')}
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-[18px]"
    >
      <TextInput
        id="sign-up-email"
        type="email"
        autoComplete="email"
        label={t('signUp.email.label')}
        hint={t('signUp.email.hint')}
        errorMessage={problemText(problems.email)}
        value={answers.email}
        onChange={(event) => setField('email', event.target.value)}
      />
      <PasswordFields
        method={answers.method}
        password={answers.password}
        confirmPassword={answers.confirmPassword}
        passwordProblem={problems.password}
        confirmProblem={problems.confirmPassword}
        onMethodChange={(method) => setField('method', method)}
        onPasswordChange={(value) => setField('password', value)}
        onConfirmChange={(value) => setField('confirmPassword', value)}
      />
      <YearOfBirthField
        value={answers.birthYear}
        problem={problems.birthYear}
        onChange={(value) => setField('birthYear', value)}
      />
      <TermsCheckbox
        isChecked={answers.acceptsTerms}
        problem={problems.acceptsTerms}
        onChange={(value) => setField('acceptsTerms', value)}
      />
      {form.failure !== null && <Notice tone="error">{t(failureMessages[form.failure])}</Notice>}
      <Button type="submit" size="xl" disabled={form.isSending}>
        {form.isSending ? t('signUp.submitting') : t('signUp.submit')}
      </Button>
    </form>
  );
}
