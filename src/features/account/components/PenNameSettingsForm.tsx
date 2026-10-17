/**
 * PenNameSettingsForm: add, change or remove the pen name in Settings › Account (story S1-E2-04;
 * board 6.3).
 *
 * An empty field removes the pen name, so the username shows on stories again. The first pen name
 * is free; after that it changes at most once every 30 days, removing it included.
 * Who shows it: AccountNamesSection. What it calls: useNamesForm → set_my_pen_name().
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

import { PenNameField } from './PenNameField';

/** What the form needs. */
interface PenNameSettingsFormProps {
  account: ReturnType<typeof useMyNames>;
  names: MyNames;
}

/**
 * Renders the form.
 *
 * @returns the pen name form
 */
export function PenNameSettingsForm({ account, names }: PenNameSettingsFormProps) {
  const { t, i18n } = useTranslation('account');
  const form = useNamesForm(account, { handle: '', penName: names.penName ?? '' });
  const [isSaved, setIsSaved] = useState(false);
  const waitUntil = nextChangeDate(names.penNameChangedAt, account.changeDays.penName, new Date());

  /** Saves the pen name and says so. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaved(await form.savePenName());
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
      <PenNameField
        id="settings-pen-name"
        value={form.penName}
        onChange={(value) => {
          setIsSaved(false);
          form.setPenName(value);
        }}
        savedOutcome={form.penNameOutcome}
        waitingDays={account.changeDays.penName}
        hint={t('settings.penNameHint', { days: account.changeDays.penName })}
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
        disabled={form.isSaving || form.penName.trim() === (names.penName ?? '')}
        className="self-start"
      >
        {form.isSaving ? t('settings.saving') : t('settings.save')}
      </Button>
    </form>
  );
}
