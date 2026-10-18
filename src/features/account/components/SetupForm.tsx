/**
 * SetupForm: the username and pen name form on the setup page (story S1-E2-04; board 2.5,
 * step 1).
 *
 * Who shows it: SetupPage, once the person's names have loaded. What it calls: useNamesForm,
 * which saves through set_my_handle() and set_my_pen_name().
 * "Save and continue" saves the username first, then the pen name if one was typed, then goes
 * to the home page. A refusal stays under its field; the username, once saved, stays saved.
 */
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { useMyNames } from '../hooks/useMyNames';
import { useNamesForm } from '../hooks/useNamesForm';

import { HandleField } from './HandleField';
import { PenNameField } from './PenNameField';

/**
 * The form, once the person's names have loaded.
 *
 * @param props.account - useMyNames's result
 * @returns the form
 */
export function SetupForm({ account }: { account: ReturnType<typeof useMyNames> }) {
  const { t } = useTranslation('account');
  const navigate = useNavigate();
  const form = useNamesForm(account, { handle: '', penName: '' });

  /** Saves the username, then the pen name if one was typed, then goes home. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!(await form.saveHandle())) return;
    if (form.penName.trim() !== '' && !(await form.savePenName())) return;
    void navigate('/');
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={(event) => void handleSubmit(event)}>
      <HandleField
        id="setup-handle"
        value={form.handle}
        onChange={form.setHandle}
        currentHandle={null}
        savedOutcome={form.handleOutcome}
        waitingDays={account.changeDays.handle}
        hint={t('handle.hint')}
      />
      <PenNameField
        id="setup-pen-name"
        value={form.penName}
        onChange={form.setPenName}
        savedOutcome={form.penNameOutcome}
        waitingDays={account.changeDays.penName}
        hint={t('penName.hint', { days: account.changeDays.penName })}
      />
      {form.saveFailed && <Notice tone="error">{t('errors.saveFailed')}</Notice>}
      <Button type="submit" size="lg" disabled={form.isSaving} className="self-start">
        {form.isSaving ? t('setup.saving') : t('setup.save')}
      </Button>
    </form>
  );
}
