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

import mailIcon from '@/assets/icons/mail.svg';
import { Button } from '@/components/ui/Button';
import { Doodle } from '@/components/ui/Doodle';

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
      <div className="flex items-center gap-3">
        {/* The board's mail icon on a soft plum square, and its smiling heart (LOOK-6). */}
        <span
          aria-hidden="true"
          className="inline-flex size-14 flex-none items-center justify-center rounded-2xl bg-tint"
        >
          <img src={mailIcon} alt="" width={38} height={38} className="block size-[38px]" />
        </span>
        <h3 className="m-0 min-w-0 font-heading text-[22px] font-bold text-heading">
          {t('signUp.sent.heading')}
        </h3>
        <Doodle
          name="smiling-heart"
          kind="widget"
          on="Check your email"
          hideBelow="phone"
          className="ml-auto w-14 shrink-0 rotate-6"
        />
      </div>
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
