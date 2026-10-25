/**
 * EmailSettingsSection: Settings › Email address (story S1-E2-05, added 25 Oct 2026: "every user,
 * minors included, can see their own email in Settings and change it whenever they want"; Robert).
 *
 * It shows the account's own address with a line saying only the owner sees it, then a form for
 * a new address. Supabase sends a link to the old and the new address, and the change happens
 * once both are opened (double_confirm_changes), so a stolen session alone can't move the account
 * to someone else's inbox. Every account can change it, with no waiting time and no account gate.
 * Who shows it: SettingsPage, for anyone signed in. What it calls: hooks/useMyEmail.ts.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { EmailChangeOutcome } from '../api/emailAddress';
import { useMyEmail } from '../hooks/useMyEmail';

/** The locale key of each refusal; 'sent' has its own success notice. */
const refusalKeys: Record<Exclude<EmailChangeOutcome, 'sent'>, string> = {
  same_address: 'email.sameAddress',
  invalid_address: 'email.invalidAddress',
  address_in_use: 'email.addressInUse',
  too_many_attempts: 'email.tooManyAttempts',
};

/**
 * The line under the form: sent, refused, failed, or nothing yet.
 *
 * @param props.email - useMyEmail's result
 * @param props.typedEmail - the address the person asked for
 * @returns a notice, or null
 */
function ChangeNotice({
  email,
  typedEmail,
}: {
  email: ReturnType<typeof useMyEmail>;
  typedEmail: string;
}) {
  const { t } = useTranslation('account');
  if (email.changeFailed) return <Notice tone="error">{t('email.changeFailed')}</Notice>;
  if (email.outcome === null) return null;
  if (email.outcome === 'sent') {
    return <Notice tone="success">{t('email.sent', { email: typedEmail.trim() })}</Notice>;
  }
  return <Notice tone="error">{t(refusalKeys[email.outcome])}</Notice>;
}

/**
 * Renders the panel.
 *
 * @returns the Email address section
 */
export function EmailSettingsSection() {
  const { t } = useTranslation('account');
  const email = useMyEmail();
  const [typedEmail, setTypedEmail] = useState('');

  /** Asks for the change, unless the field is empty. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (typedEmail.trim() !== '') email.change(typedEmail);
  }

  return (
    <section
      aria-labelledby="settings-email-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2
        id="settings-email-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('email.heading')}
      </h2>
      {email.loadFailed && <Notice tone="error">{t('errors.loadFailed')}</Notice>}
      {email.email !== null && (
        <p className="m-0 text-body">
          {t('email.current')} <strong className="break-all text-ink">{email.email}</strong>
        </p>
      )}
      <p className="m-0 text-[13px] text-meta">{t('email.private')}</p>
      {email.pendingEmail !== null && (
        <Notice tone="info">{t('email.pending', { email: email.pendingEmail })}</Notice>
      )}
      <form noValidate className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <TextInput
          id="settings-new-email"
          type="email"
          autoComplete="email"
          label={t('email.newLabel')}
          hint={t('email.newHint')}
          value={typedEmail}
          onChange={(event) => {
            email.resetChange();
            setTypedEmail(event.target.value);
          }}
        />
        <ChangeNotice email={email} typedEmail={typedEmail} />
        <div>
          <Button
            type="submit"
            variant="secondary"
            disabled={email.isChanging || typedEmail.trim() === ''}
          >
            {email.isChanging ? t('email.sending') : t('email.change')}
          </Button>
        </div>
      </form>
    </section>
  );
}
