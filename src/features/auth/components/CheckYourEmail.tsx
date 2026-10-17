/**
 * CheckYourEmail: what the sign-up card shows once the link has been sent, board 2.1 "What you
 * might see next" (story S1-E2-01).
 *
 * It says where the link went and that, until it is opened, the account can read but not publish,
 * comment, post or message (is_active_member() is false while the email is unconfirmed). "Send the
 * link again" asks Supabase to resend it.
 * Who uses it: SignUpPage, in place of the form.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

/** What the step needs. */
interface CheckYourEmailProps {
  email: string;
  /** True when the person chose "Email me a log-in link instead". */
  isLinkSignUp: boolean;
  /** Sends the link again; rejects when that fails. */
  onResend: () => Promise<void>;
}

/**
 * Renders the step.
 *
 * @returns a status message with the resend button
 */
export function CheckYourEmail({ email, isLinkSignUp, onResend }: CheckYourEmailProps) {
  const { t } = useTranslation('auth');
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  /** Sends again and says how it went. */
  async function resend() {
    setResendState('sending');
    try {
      await onResend();
      setResendState('sent');
    } catch {
      setResendState('failed');
    }
  }

  return (
    <div role="status" className="flex flex-col gap-3">
      <h3 className="m-0 font-heading text-[22px] font-bold text-heading">
        {t('signUp.sent.heading')}
      </h3>
      <p className="m-0 text-body">
        {t(isLinkSignUp ? 'signUp.sent.bodyLink' : 'signUp.sent.body', { email })}
      </p>
      <p className="m-0 text-sm text-meta">{t('signUp.sent.spam')}</p>
      <Button
        variant="secondary"
        className="self-start"
        disabled={resendState === 'sending'}
        onClick={() => void resend()}
      >
        {t('signUp.sent.resend')}
      </Button>
      {resendState === 'sent' && <p className="m-0 text-sm text-body">{t('signUp.sent.resent')}</p>}
      {resendState === 'failed' && (
        <p className="m-0 text-sm text-destructive">{t('signUp.errors.tooManyAttempts')}</p>
      )}
    </div>
  );
}
