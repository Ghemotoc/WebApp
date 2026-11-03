/**
 * DisqualifyForm: the reason for disqualifying one contest entry, then "Disqualify" (story
 * S1-E11-15 criterion 6; bundle CONTESTS-13b2a).
 *
 * A reason is required because the writer reads it in their statement of reasons (DSA art. 17)
 * and can appeal it (S1-E10-07). The form says so, so staff write it to the writer. Plain staff
 * components, no doodles.
 * Who shows it: ContestEntriesSection, under the entry staff chose.
 * What it calls: disqualify() from useContestEntries().
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Textarea';
import { disqualifyReasonLimit, type StaffContestEntry } from '@/schemas/contests';

import type { useContestEntries } from '../../hooks/useContestEntries';
import { useContestTranslation } from '../../registerContestTranslations';

/** What the form needs. */
interface DisqualifyFormProps {
  entry: StaffContestEntry;
  entries: ReturnType<typeof useContestEntries>;
  /** Closes the form, after a disqualification or on Cancel. */
  onClose: () => void;
}

/**
 * Renders the form.
 *
 * @returns the form
 */
export function DisqualifyForm({ entry, entries, onClose }: DisqualifyFormProps) {
  const { t } = useContestTranslation();
  const [reason, setReason] = useState('');
  const isEmpty = reason.trim() === '';
  /** Sends the reason; the form closes once the server has disqualified the entry. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (isEmpty) return;
    entries.disqualify({ entryId: entry.id, reason: reason.trim() }, onClose);
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby="disqualify-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
    >
      <h3 id="disqualify-heading" className="m-0 font-heading text-[18px] font-bold text-heading">
        {t('staff.entries.disqualifyHeading', { name: entry.pen_name })}
      </h3>
      <Textarea
        id="disqualify-reason"
        label={t('staff.entries.reason')}
        hint={t('staff.entries.reasonHint', {
          count: reason.length,
          limit: disqualifyReasonLimit,
        })}
        value={reason}
        maxLength={disqualifyReasonLimit}
        onChange={(event) => setReason(event.target.value)}
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="destructive" disabled={isEmpty || entries.isRunning}>
          {t('staff.entries.disqualify')}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t('staff.entries.cancel')}
        </Button>
      </div>
      <div aria-live="polite">
        {entries.failure !== null && (
          <Notice tone="error">
            {t(`staff.entries.failures.${entries.failure.reason}`, {
              defaultValue: t('staff.entries.failures.failed'),
            })}
          </Notice>
        )}
      </div>
    </form>
  );
}
