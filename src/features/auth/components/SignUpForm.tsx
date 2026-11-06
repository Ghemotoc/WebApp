/**
 * SignUpForm: the sign-up form, board 2.1 (story S1-E2-01).
 *
 * Fields (S1-E2-01 criterion 1): email; a password typed twice, or "Email me a log-in link
 * instead"; the country the person lives in (MARKETS-1, SignUpCountryField, starting on the country of
 * the connection); year of birth, and the month only when needed (S1-E2-02, BirthFields); and
 * acceptance of the current terms with consent to the privacy notice.
 * The username sits under the email, with the same live "is it free?" check as setup (Robert,
 * 25 Oct 2026: chosen with the password, so the account has a name from the start); the pen name
 * stays optional and comes in setup or Settings (S1-E2-04). Under "Create account", the Google,
 * Apple and Microsoft buttons (SocialSignUp, S1-E2-09) show only while the social_login flag is on.
 * What it calls: useSignUpForm (checks, the leaked-password check, Supabase Auth). Once the link
 * is sent, the parent shows CheckYourEmail instead.
 * Who uses it: SignUpPage.
 */
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { HandleField } from '@/features/account/components/HandleField';
import { useFeatureFlags } from '@/features/flags/hooks/useFeatureFlags';
import type { HandleOutcome } from '@/features/account/lib/nameRules';

import type { SignUpFailure } from '../api/signUp';
import type { useSignUpForm } from '../hooks/useSignUpForm';

import { BirthFields } from './BirthFields';
import { PasswordFields } from './PasswordFields';
import { SignUpCountryField } from './SignUpCountryField';
import { SocialSignUp } from './SocialSignUp';
import { TermsCheckbox } from './TermsCheckbox';

/** The message key for each way a sign-up can fail. */
const failureMessages: Record<SignUpFailure, string> = {
  refused: 'signUp.errors.refused',
  disposable_email: 'signUp.errors.disposableEmail',
  weak_password: 'signUp.errors.weakPassword',
  too_many_attempts: 'signUp.errors.tooManyAttempts',
  unreachable: 'signUp.errors.unreachable',
};

/** What the form needs: the state from useSignUpForm. */
interface SignUpFormProps {
  form: ReturnType<typeof useSignUpForm>;
  /** True while sign-up is followed by the age check; false in March (adults_only on). */
  includesAgeCheck: boolean;
}

/**
 * Renders the form.
 *
 * @returns the form with its fields, the failure message and the submit button
 */
export function SignUpForm({ form, includesAgeCheck }: SignUpFormProps) {
  const { t } = useTranslation('auth');
  const { answers, setField, problems } = form;
  // Off in March: the buttons appear only once the providers are set up (S1-E2-09).
  const isSocialLoginOn = useFeatureFlags().isOn('social_login', false);

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
        errorMessage={problems.email === undefined ? undefined : t(problems.email)}
        value={answers.email}
        onChange={(event) => setField('email', event.target.value)}
      />
      <HandleField
        id="sign-up-handle"
        value={answers.handle}
        onChange={(value) => setField('handle', value)}
        currentHandle={null}
        savedOutcome={(problems.handle as HandleOutcome | undefined) ?? null}
        waitingDays={0}
        hint={t('signUp.handleHint')}
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
      {/* The country before the year: its law can make the month matter (MARKETS-1). */}
      <SignUpCountryField form={form} />
      <BirthFields form={form} includesAgeCheck={includesAgeCheck} />
      <TermsCheckbox
        isChecked={answers.acceptsTerms}
        problem={problems.acceptsTerms}
        onChange={(value) => setField('acceptsTerms', value)}
      />
      {form.failure !== null && <Notice tone="error">{t(failureMessages[form.failure])}</Notice>}
      <Button type="submit" size="xl" disabled={form.isSending}>
        {form.isSending ? t('signUp.submitting') : t('signUp.submit')}
      </Button>
      {isSocialLoginOn && <SocialSignUp form={form} />}
    </form>
  );
}
