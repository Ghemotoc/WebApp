/**
 * ForgotPasswordPage: "Reset your password", board 2.2 (story S1-E2-05).
 *
 * Who shows it: the router, at /forgot-password; "Forgot your password?" and the log-in messages
 * link here, and so does the "password changed" email.
 * What it does: emails a reset link (supabase/templates/recovery.html) and then says "If there's
 * an account for …, we've sent it a link", whatever the answer, so it never reveals who has an
 * account. "Send the link again" repeats it.
 * What it calls: api/signIn.ts → sendResetLink().
 */
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import { useResetRequest } from '../hooks/useResetRequest';

import { AuthCard } from './AuthCard';
import { SendProblem } from './SendProblem';

/**
 * Renders the page.
 *
 * @returns the reset request screen
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const request = useResetRequest();
  const isSending = request.state === 'sending';

  /** "Send reset link" submits the form. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void request.send();
  }

  return (
    <AuthCard
      documentTitle={t('forgot.documentTitle')}
      eyebrow={t('forgot.eyebrow')}
      heading={request.hasSent ? t('forgot.sentHeading') : t('forgot.heading')}
      intro={
        request.hasSent ? t('forgot.sentBody', { email: request.email.trim() }) : t('forgot.body')
      }
    >
      {request.hasSent ? (
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm text-body">{t('forgot.spam')}</p>
          <SendProblem state={request.state} />
          <Button
            variant="secondary"
            className="self-start"
            disabled={isSending}
            onClick={() => void request.send()}
          >
            {t('forgot.resend')}
          </Button>
        </div>
      ) : (
        <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TextInput
            id="forgot-email"
            type="email"
            autoComplete="email"
            label={t('forgot.email')}
            value={request.email}
            onChange={(event) => request.setEmail(event.target.value)}
          />
          <SendProblem state={request.state} />
          <Button type="submit" size="lg" disabled={isSending}>
            {isSending ? t('forgot.submitting') : t('forgot.submit')}
          </Button>
        </form>
      )}
      <Link to="/sign-in" className="self-start text-sm text-link underline">
        {t('forgot.backToLogIn')}
      </Link>
    </AuthCard>
  );
}
