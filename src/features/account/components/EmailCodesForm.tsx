/**
 * EmailCodesForm: the two code boxes under Settings › Email address while a change waits
 * (story S1-E2-05; Robert, 25 Oct 2026, 09:15: codes to the old and the new address, typed here,
 * instead of links).
 *
 * The person types the code from their current inbox and the one from the new inbox, then
 * presses "Confirm the change". A right code is marked and locked; a wrong or expired one says
 * so and offers "Send new codes". The address changes only once both are right.
 * Who shows it: EmailSettingsSection, while Supabase holds a waiting new address.
 * What it calls: hooks/useEmailChangeCodes.ts, EmailCodeField (each box), and onSendNewCodes
 * (useMyEmail's change()).
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { useEmailChangeCodes } from '../hooks/useEmailChangeCodes';

import { EmailCodeField } from './EmailCodeField';

/** What the form needs from its section. */
export interface EmailCodesFormProps {
  currentEmail: string;
  newEmail: string;
  /** Asks Supabase for two fresh codes (the old ones stop working). */
  onSendNewCodes: () => void;
  /** Called once both codes were right and the address changed. */
  onChanged: (newEmail: string) => void;
}

/**
 * Renders the two boxes and the buttons.
 *
 * @returns the form
 */
export function EmailCodesForm({
  currentEmail,
  newEmail,
  onSendNewCodes,
  onChanged,
}: EmailCodesFormProps) {
  const { t } = useTranslation('account');
  const codes = useEmailChangeCodes(currentEmail, newEmail);
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');

  /** Checks the codes that aren't confirmed yet. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    codes.check({ currentCode, newCode });
  }

  // Both right: tell the section, which shows the "Done" line in place of this form.
  useEffect(() => {
    if (codes.isDone) onChanged(newEmail);
  }, [codes.isDone, newEmail, onChanged]);

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <Notice tone="info">{t('email.pending', { email: newEmail })}</Notice>
      <h3 className="m-0 font-heading text-lg font-bold text-heading">{t('email.codesHeading')}</h3>
      <EmailCodeField
        id="settings-current-email-code"
        label={t('email.currentCodeLabel')}
        address={currentEmail}
        result={codes.results.current}
        value={currentCode}
        onChange={setCurrentCode}
      />
      <EmailCodeField
        id="settings-new-email-code"
        label={t('email.newCodeLabel')}
        address={newEmail}
        result={codes.results.new}
        value={newCode}
        onChange={setNewCode}
      />
      {codes.checkFailed && <Notice tone="error">{t('email.codesCheckFailed')}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={codes.isChecking}>
          {codes.isChecking ? t('email.checkingCodes') : t('email.confirmCodes')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            // New codes replace the old ones, so both boxes start again.
            codes.reset();
            setCurrentCode('');
            setNewCode('');
            onSendNewCodes();
          }}
        >
          {t('email.sendNewCodes')}
        </Button>
      </div>
    </form>
  );
}
