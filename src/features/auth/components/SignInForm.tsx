/**
 * SignInForm: the log-in form, board 2.2 (story S1-E2-05).
 *
 * Email, password (with Show / Hide), "Forgot your password?", the message after a try, "Log in"
 * and "Email me a log-in link". Who shows it: SignInPage. What it calls: useSignInForm's actions.
 */
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { useSignInForm } from '../hooks/useSignInForm';

import { PasswordInput } from './PasswordInput';
import { SignInMessage } from './SignInMessage';

/**
 * Renders the form.
 *
 * @param props.form - useSignInForm's result
 * @returns the form
 */
export function SignInForm({ form }: { form: ReturnType<typeof useSignInForm> }) {
  const { t } = useTranslation('auth');

  /** "Log in" submits the form. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void form.logIn();
  }

  return (
    <form
      noValidate
      aria-label={t('signIn.formLabel')}
      className="flex flex-col gap-4"
      onSubmit={handleSubmit}
    >
      <TextInput
        id="sign-in-email"
        type="email"
        autoComplete="email"
        label={t('signIn.email')}
        value={form.email}
        onChange={(event) => form.setEmail(event.target.value)}
      />
      <div className="flex flex-col gap-1">
        <PasswordInput
          id="sign-in-password"
          autoComplete="current-password"
          label={t('signIn.password')}
          value={form.password}
          onChange={(event) => form.setPassword(event.target.value)}
        />
        <Link
          to="/forgot-password"
          className="inline-flex min-h-11 items-center self-start text-sm text-link underline"
        >
          {t('signIn.forgot')}
        </Link>
      </div>
      <SignInMessage message={form.message} />
      <Button type="submit" size="lg" disabled={form.isBusy}>
        {form.isBusy ? t('signIn.submitting') : t('signIn.submit')}
      </Button>
      <Button
        variant="secondary"
        size="lg"
        disabled={form.isBusy}
        onClick={() => void form.emailLink()}
      >
        {t('signIn.sendLink')}
      </Button>
    </form>
  );
}
