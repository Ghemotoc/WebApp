/**
 * MakeInviteForm: "Make an invite link" on /staff/invites (story S1-E11-17).
 *
 * Board (AdminUsers, Invites tab): how many people (1 to 50, default 1), expires in (1, 7, 14 or
 * 30 days, default 14) and an optional private note (at most 80 characters; only staff see it;
 * never an email or a full name). The database checks the same limits again
 * (admin_create_invite()). Who shows it: InvitesPage. What it calls: the make() it is given.
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { NewInviteRequest } from '../../api/inviteLinks';

/** The expiry choices from the board, in days. */
const expiryChoices = ['1', '7', '14', '30'];

/** What the form keeps while it is open. */
interface FormValues {
  admits: string;
  validDays: string;
  note: string;
}

/**
 * The three fields: how many, expires in, note.
 *
 * @param props.values - what is typed
 * @param props.onChange - the new values
 * @returns the fields in a row (stacked on phones)
 */
function InviteFields({
  values,
  onChange,
}: {
  values: FormValues;
  onChange: (values: FormValues) => void;
}) {
  const { t } = useTranslation('staff');
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <TextInput
        id="invite-admits"
        type="number"
        min={1}
        max={50}
        inputMode="numeric"
        label={t('invites.form.admits')}
        hint={t('invites.form.admitsHint')}
        value={values.admits}
        onChange={(event) => onChange({ ...values, admits: event.target.value })}
      />
      <div className="flex flex-col gap-1.5">
        <Select
          id="invite-expiry"
          label={t('invites.form.expires')}
          isLabelVisible
          options={expiryChoices.map((days) => ({
            value: days,
            label: t(`invites.form.days.${days}`),
          }))}
          value={values.validDays}
          onChange={(validDays) => onChange({ ...values, validDays })}
        />
      </div>
      <TextInput
        id="invite-note"
        maxLength={80}
        label={t('invites.form.note')}
        hint={t('invites.form.noteHint')}
        value={values.note}
        onChange={(event) => onChange({ ...values, note: event.target.value })}
      />
    </div>
  );
}

/** What the form needs. */
interface MakeInviteFormProps {
  isMaking: boolean;
  onMake: (request: NewInviteRequest) => Promise<unknown>;
  onCancel: () => void;
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function MakeInviteForm({ isMaking, onMake, onCancel }: MakeInviteFormProps) {
  const { t } = useTranslation('staff');
  const [values, setValues] = useState<FormValues>({ admits: '1', validDays: '14', note: '' });
  const [problem, setProblem] = useState<string | null>(null);

  /** Checks the number and the note in plain words, then asks the database. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const admits = Number(values.admits);
    if (!Number.isInteger(admits) || admits < 1 || admits > 50) {
      return setProblem(t('invites.form.admitsOutOfRange'));
    }
    if (values.note.includes('@')) return setProblem(t('invites.form.noteHasEmail'));
    setProblem(null);
    // A refusal is shown by the page from useInviteLinks; nothing else to do here.
    await onMake({ admits, validDays: Number(values.validDays), note: values.note }).catch(
      () => undefined,
    );
  }

  return (
    <form
      noValidate
      aria-label={t('invites.form.label')}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <InviteFields values={values} onChange={setValues} />
      {problem !== null && <Notice tone="error">{problem}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isMaking}>
          {t(isMaking ? 'invites.form.making' : 'invites.form.make')}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {t('invites.form.cancel')}
        </Button>
      </div>
    </form>
  );
}
