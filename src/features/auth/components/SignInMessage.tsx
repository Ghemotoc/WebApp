/**
 * SignInMessage: what the log-in card says after a try, board 2.2 "Messages you might see"
 * (story S1-E2-05).
 *
 * A wrong email and a wrong password give the same words ("That email and password don't
 * match."), so the message never reveals whether an account exists. The pause message names how
 * long it lasts and when it ends. Errors use role="alert" (Notice), so they are read out at once.
 * Who shows it: SignInPage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { usePublicSettings } from '@/features/flags/hooks/usePublicSettings';

import type { SignInMessage as Message } from '../hooks/useSignInForm';

/**
 * The "Reset password" link under the two messages that offer it.
 *
 * @returns the link
 */
function ResetLink() {
  const { t } = useTranslation('auth');
  return (
    <Link to="/forgot-password" className="text-link underline">
      {t('signIn.resetPassword')}
    </Link>
  );
}

/**
 * The pause message, with the settings' numbers and the time it ends.
 *
 * @param props.until - when logging in may start again
 * @returns the message box
 */
function PausedMessage({ until }: { until: Date }) {
  const { t, i18n } = useTranslation('auth');
  const settings = usePublicSettings();
  const time = new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-GB' : 'ro', {
    timeStyle: 'short',
  }).format(until);
  return (
    <Notice
      tone="error"
      title={t('signIn.pausedTitle', { minutes: settings.numberOf('sign_in_pause_minutes', 15) })}
    >
      {t('signIn.pausedBody', { tries: settings.numberOf('sign_in_pause_tries', 5), time })}{' '}
      <ResetLink />
    </Notice>
  );
}

/** The messages that are one sentence, by kind, with their tone. */
const simpleMessages: Record<string, { key: string; tone: 'error' | 'success' }> = {
  email_missing: { key: 'signIn.emailMissing', tone: 'error' },
  password_missing: { key: 'signIn.passwordMissing', tone: 'error' },
  email_not_confirmed: { key: 'signIn.notConfirmed', tone: 'error' },
  too_many_attempts: { key: 'signIn.tooManyAttempts', tone: 'error' },
  unreachable: { key: 'signIn.unreachable', tone: 'error' },
};

/**
 * Renders the message, or nothing.
 *
 * @param props.message - the last try's result
 * @returns the message box
 */
export function SignInMessage({ message }: { message: Message | null }) {
  const { t } = useTranslation('auth');
  if (message === null || message.kind === 'signed_in') return null;
  if (message.kind === 'wrong_details') {
    return (
      <Notice tone="error" title={t('signIn.wrongDetailsTitle')}>
        {t('signIn.wrongDetailsBody')} <ResetLink />
      </Notice>
    );
  }
  if (message.kind === 'paused') return <PausedMessage until={message.until} />;
  if (message.kind === 'link_sent') {
    return <Notice tone="success">{t('signIn.linkSent', { email: message.email })}</Notice>;
  }
  const simple = simpleMessages[message.kind];
  return simple === undefined ? null : <Notice tone={simple.tone}>{t(simple.key)}</Notice>;
}
