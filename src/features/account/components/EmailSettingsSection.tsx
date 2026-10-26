/**
 * EmailSettingsSection: Settings › Email address (story S1-E2-05, added 25 Oct 2026: "every user,
 * minors included, can see their own email in Settings and change it whenever they want"; Robert).
 *
 * It shows the account's own address with a line saying only the owner sees it, then a form for
 * a new address. Supabase sends a 6-digit code to the old and the new address, and the change
 * happens once both are typed in (double_confirm_changes; Robert, 25 Oct 2026, 09:15), so a
 * stolen session alone can't move the account to someone else's inbox. Every account can change
 * it, with no waiting time and no account gate.
 * Who shows it: SettingsPage, for anyone signed in. What it calls: hooks/useMyEmail.ts,
 * NewEmailForm (asking for the change) and EmailCodesForm (the two code boxes).
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Notice } from '@/components/ui/Notice';

import { useMyEmail } from '../hooks/useMyEmail';

import { EmailCodesForm } from './EmailCodesForm';
import { NewEmailForm } from './NewEmailForm';

/**
 * Renders the panel.
 *
 * @returns the Email address section
 */
export function EmailSettingsSection() {
  const { t } = useTranslation('account');
  const email = useMyEmail();
  const [typedEmail, setTypedEmail] = useState('');
  const [changedTo, setChangedTo] = useState<string | null>(null);
  // Stable, so the codes form's effect runs once.
  const handleChanged = useCallback((newEmail: string) => {
    setChangedTo(newEmail);
    setTypedEmail('');
  }, []);

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
      {changedTo !== null && (
        <Notice tone="success">{t('email.changed', { email: changedTo })}</Notice>
      )}
      {email.pendingEmail !== null && email.email !== null && (
        <EmailCodesForm
          currentEmail={email.email}
          newEmail={email.pendingEmail}
          onSendNewCodes={() => email.change(email.pendingEmail ?? '')}
          onChanged={handleChanged}
        />
      )}
      <NewEmailForm
        email={email}
        typedEmail={typedEmail}
        showNotice={changedTo === null}
        onTyped={(value) => {
          setChangedTo(null);
          setTypedEmail(value);
        }}
      />
    </section>
  );
}
