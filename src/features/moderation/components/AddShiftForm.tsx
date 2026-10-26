/**
 * AddShiftForm: "Add a shift" on the on-call rota, for owners and admins: who, from when, until
 * when, and why (story S1-E10-09). Only people with the "on call for removal orders" permission
 * are offered; the database checks it again, and refuses a shift that overlaps another.
 *
 * The times are typed in the browser's own time and sent as exact moments, so the rota shows them
 * in Romania time whatever the editor's clock says.
 * Who shows it: OnCallRotaPage. What it calls: the add() it is given (useOnCallRota).
 */
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import type { OnCallRota } from '../api/removalOrders';
import type { useOnCallRota } from '../hooks/useOnCallRota';

/** The form's fields. */
interface ShiftFields {
  userId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
}

/**
 * Whether every field is filled and the end comes after the start.
 *
 * @returns true when the shift can be sent
 */
function isComplete(fields: ShiftFields): boolean {
  if (
    fields.userId === '' ||
    fields.startsAt === '' ||
    fields.endsAt === '' ||
    fields.reason.trim() === ''
  )
    return false;
  return new Date(fields.endsAt).getTime() > new Date(fields.startsAt).getTime();
}

/** An empty form. */
const emptyFields: ShiftFields = { userId: '', startsAt: '', endsAt: '', reason: '' };

/**
 * The person, the two times and the reason.
 *
 * @returns the four inputs
 */
function ShiftInputs({
  fields,
  people,
  onChange,
}: {
  fields: ShiftFields;
  people: OnCallRota['people'];
  onChange: (key: keyof ShiftFields, value: string) => void;
}) {
  const { t } = useTranslation('moderation');
  return (
    <>
      <Select
        id="shift-person"
        label={t('onCall.person')}
        isLabelVisible
        placement="form"
        value={fields.userId}
        onChange={(value) => onChange('userId', value)}
        options={[
          { value: '', label: t('onCall.choosePerson') },
          ...people.map((person) => ({ value: person.userId, label: `@${person.handle}` })),
        ]}
      />
      <TextInput
        id="shift-starts"
        type="datetime-local"
        label={t('onCall.startsAt')}
        value={fields.startsAt}
        onChange={(event) => onChange('startsAt', event.target.value)}
      />
      <TextInput
        id="shift-ends"
        type="datetime-local"
        label={t('onCall.endsAt')}
        value={fields.endsAt}
        onChange={(event) => onChange('endsAt', event.target.value)}
      />
      <TextInput
        id="shift-reason"
        label={t('onCall.reason')}
        hint={t('reason.hint')}
        value={fields.reason}
        onChange={(event) => onChange('reason', event.target.value)}
      />
    </>
  );
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function AddShiftForm({
  rotaData,
  rota,
}: {
  rotaData: OnCallRota;
  rota: ReturnType<typeof useOnCallRota>;
}) {
  const { t } = useTranslation('moderation');
  const [fields, setFields] = useState<ShiftFields>(emptyFields);
  const [isMissing, setIsMissing] = useState(false);
  const change = (key: keyof ShiftFields, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  /** Checks the fields, then asks the database; a refusal shows from the hook's state. */
  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsMissing(!isComplete(fields));
    if (!isComplete(fields)) return;
    // The browser's local times become exact moments, so the rota can show them in Romania time.
    const shift = {
      userId: fields.userId,
      startsAt: new Date(fields.startsAt).toISOString(),
      endsAt: new Date(fields.endsAt).toISOString(),
      reason: fields.reason.trim(),
    };
    try {
      await rota.add(shift);
      setFields(emptyFields);
    } catch {
      // Shown from addFailure below.
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      aria-labelledby="add-shift-heading"
      className="flex max-w-[560px] flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="add-shift-heading" className="m-0 font-heading text-xl font-bold text-heading">
        {t('onCall.addHeading')}
      </h2>
      <ShiftInputs fields={fields} people={rotaData.people} onChange={change} />
      {isMissing && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {t('onCall.missing')}
        </p>
      )}
      {rota.addFailure !== null && (
        <Notice tone="error">{t(`onCall.failures.${rota.addFailure}`)}</Notice>
      )}
      <div>
        <Button type="submit" disabled={rota.isAdding}>
          {t('onCall.add')}
        </Button>
      </div>
    </form>
  );
}
