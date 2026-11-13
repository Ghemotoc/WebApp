/**
 * NewPasswordForm: "New password" and "Confirm new password" with "Save new password"
 * (story S1-E2-05).
 *
 * Who shows it: ResetPasswordPage, once the reset link has signed the person in. The rules are
 * sign-up's (useNewPasswordForm); a problem shows under the field it belongs to.
 */
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { useNewPasswordForm } from '../hooks/useNewPasswordForm';

import { PasswordInput } from './PasswordInput';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

/** Problems that belong under the second field; the others go under the first. */
const confirmProblems = new Set(['signUp.errors.passwordsDiffer']);

/**
 * Renders the form.
 *
 * @param props.form - useNewPasswordForm's result
 * @returns the form
 */
export function NewPasswordForm({ form }: { form: ReturnType<typeof useNewPasswordForm> }) {
  const { t } = useTranslation('auth');
  const problem = form.problem;
  const isConnectionProblem = problem === 'signIn.unreachable';
  const isConfirmProblem = problem !== null && confirmProblems.has(problem);
  const passwordError =
    problem === null || isConfirmProblem || isConnectionProblem ? undefined : t(problem);

  /** "Save new password" submits the form. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void form.save();
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <PasswordInput
        id="reset-password"
        autoComplete="new-password"
        label={t('reset.newPassword')}
        hint={form.password === '' ? t('signUp.password.hint') : undefined}
        errorMessage={passwordError}
        value={form.password}
        onChange={(event) => form.setPassword(event.target.value)}
      />
      {/* The strength line takes the rule's place as the person types (PASSWORD-1). */}
      <PasswordStrengthMeter password={form.password} id="reset-password-strength" />
      <PasswordInput
        id="reset-confirm-password"
        autoComplete="new-password"
        label={t('reset.confirmPassword')}
        errorMessage={isConfirmProblem && problem !== null ? t(problem) : undefined}
        value={form.confirmPassword}
        onChange={(event) => form.setConfirmPassword(event.target.value)}
      />
      {isConnectionProblem && <Notice tone="error">{t('signIn.unreachable')}</Notice>}
      <Button type="submit" size="lg" disabled={form.isSaving}>
        {form.isSaving ? t('reset.submitting') : t('reset.submit')}
      </Button>
    </form>
  );
}
