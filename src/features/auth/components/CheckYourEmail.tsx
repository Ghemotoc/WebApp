/**
 * CheckYourEmail: what the sign-up card shows once the link has been sent, board 2.1 "What you
 * might see next" (story S1-E2-01).
 *
 * It says where the link went and that, until it is opened, the account can read but not publish,
 * comment, post or message (is_active_member() is false while the email is unconfirmed). "Send the
 * link again" asks Supabase to resend it.
 * On the waiting list (WAITLIST-1) the heading says "You're on the list" and a line says what
 * happens next: confirm the email, then wait for the "You're in" email.
 * Who uses it: SignUpPage, in place of the form.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionIcon } from '@/components/icons/ActionIcon';
import { Button } from '@/components/ui/Button';

/** What the step needs. */
interface CheckYourEmailProps {
  email: string;
  /** True when the person chose "Email me a log-in link instead". */
  isLinkSignUp: boolean;
  /** Sends the link again; rejects when that fails. */
  onResend: () => Promise<void>;
  /** True when the person joined the waiting list (WAITLIST-1): "You're on the list". */
  joinsWaitlist?: boolean;
}

/**
 * The first line: where the link went and what it does, for the way the person signed up.
 *
 * @param isLinkSignUp - an emailed log-in link instead of a password
 * @param joinsWaitlist - the person joined the waiting list
 * @returns the locale key
 */
function bodyKey(isLinkSignUp: boolean, joinsWaitlist: boolean): string {
  if (joinsWaitlist) return 'signUp.sent.waitlistBody';
  return isLinkSignUp ? 'signUp.sent.bodyLink' : 'signUp.sent.body';
}

/**
 * Renders the step.
 *
 * @returns a status message with the resend button
 */
export function CheckYourEmail({
  email,
  isLinkSignUp,
  onResend,
  joinsWaitlist = false,
}: CheckYourEmailProps) {
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
        {/* The board's mail icon on a soft plum square; decorative. */}
        <span
          aria-hidden="true"
          className="inline-flex size-14 flex-none items-center justify-center rounded-2xl bg-tint text-heading"
        >
          <ActionIcon name="mail" size={28} />
        </span>
        <h3 className="m-0 min-w-0 font-heading text-[22px] font-bold text-heading">
          {t(joinsWaitlist ? 'signUp.sent.waitlistHeading' : 'signUp.sent.heading')}
        </h3>
      </div>
      <p className="m-0 text-body">{t(bodyKey(isLinkSignUp, joinsWaitlist), { email })}</p>
      {/* On the list: confirming the email keeps the place; staff let people in (WAITLIST-1). */}
      {joinsWaitlist && <p className="m-0 text-body">{t('signUp.sent.waitlistNext')}</p>}
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
