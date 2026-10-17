/**
 * HandleSettingsForm: change the username in Settings › Account (story S1-E2-04; board 6.3).
 *
 * Shows the username field with its live check, the "once every 30 days" rule and, after a
 * change, the date it may change again (the first change after setup doesn't wait).
 * Who shows it: AccountNamesSection. What it calls: useNamesForm → set_my_handle().
 */
import type { FormEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { formatLegalDate } from '@/features/legal/lib/legalDocumentList';

import type { MyNames } from '../api/accountNames';
import type { useMyNames } from '../hooks/useMyNames';
import { useNamesForm } from '../hooks/useNamesForm';
import { nextChangeDate } from '../lib/nameRules';

import { HandleField } from './HandleField';

/** What the form needs. */
interface HandleSettingsFormProps {
  account: ReturnType<typeof useMyNames>;
  names: MyNames;
}

/**
 * Renders the form.
 *
 * @returns the username form
 */
export function HandleSettingsForm({ account, names }: HandleSettingsFormProps) {
  const { t, i18n } = useTranslation('account');
  const form = useNamesForm(account, { handle: names.handle ?? '', penName: '' });
  const [isSaved, setIsSaved] = useState(false);
  const waitUntil = nextChangeDate(names.handleChangedAt, account.changeDays.handle, new Date());

  /** Saves the username and says so. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaved(await form.saveHandle());
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
      <HandleField
        id="settings-handle"
        value={form.handle}
        onChange={(value) => {
          setIsSaved(false);
          form.setHandle(value);
        }}
        currentHandle={names.handle}
        savedOutcome={form.handleOutcome}
        waitingDays={account.changeDays.handle}
        hint={t('settings.usernameHint', { days: account.changeDays.handle })}
      />
      {waitUntil !== null && (
        <p className="m-0 text-[13px] text-meta">
          {t('settings.nextChange', {
            date: formatLegalDate(waitUntil.toISOString(), i18n.language),
          })}
        </p>
      )}
      {form.saveFailed && <Notice tone="error">{t('errors.saveFailed')}</Notice>}
      {isSaved && <Notice tone="success">{t('settings.saved')}</Notice>}
      <Button
        type="submit"
        variant="secondary"
        disabled={form.isSaving || form.handle === names.handle}
        className="self-start"
      >
        {form.isSaving ? t('settings.saving') : t('settings.save')}
      </Button>
    </form>
  );
}
