/**
 * PupilPointsReport: "Report points · vlad.writes", the form under the teacher's class points
 * table (bundle BOOKS-8, part 8b; board G09-ClassPoints, user story 8.9).
 *
 * What it shows: why the teacher reports (they never see who gave points, so a moderator
 * checks), "Why" with three reasons, "What did you notice? (optional)", "Send report" and
 * "Cancel". Sending passes the pupil, the reason and the note to the moderators and adds a line
 * to the class log; the form then says it was sent. A pupil with no class points can't be
 * reported, and the form says so in words.
 * Who shows it: ClassPointsPage, after "Report points" on a row; Cancel closes it.
 * What it calls: useReportPupilPoints → report_pupil_class_points().
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';
import { SpaceRadioGroup } from '@/features/spaces/components/SpaceRadioGroup';

import type { PointsReportReason, TablePupil } from '../api/classPointsTable';
import { useReportPupilPoints } from '../hooks/useClassPoints';
import { useClassPointsTranslation } from '../registerClassPointsTranslations';

/** The reasons, in the board's order. */
const reasons: PointsReportReason[] = ['swapped', 'not_writing', 'other'];

/** What the form needs. */
interface PupilPointsReportProps {
  slug: string;
  pupil: TablePupil;
  onClose: () => void;
}

/**
 * What happened: the refusal in words, or that the report was sent.
 *
 * @returns the live region
 */
function ReportOutcome(props: { failure: string | null; isSent: boolean; name: string }) {
  const { t } = useClassPointsTranslation();
  return (
    <div aria-live="polite">
      {props.failure === 'not_offered' && (
        <Notice tone="info">{t('pupilReport.nothing', { name: props.name })}</Notice>
      )}
      {props.failure !== null && props.failure !== 'not_offered' && (
        <Notice tone="error">{t(`failures.${props.failure}`)}</Notice>
      )}
      {props.isSent && (
        <Notice tone="success">{t('pupilReport.sent', { name: props.name })}</Notice>
      )}
    </div>
  );
}

/**
 * Renders the form.
 *
 * @returns the section
 */
export function PupilPointsReport({ slug, pupil, onClose }: PupilPointsReportProps) {
  const { t } = useClassPointsTranslation();
  const sender = useReportPupilPoints(slug);
  const [reason, setReason] = useState<PointsReportReason>('swapped');
  const [note, setNote] = useState('');
  const [isSent, setIsSent] = useState(false);

  /** Sends the report, then says so. */
  function send(event: FormEvent) {
    event.preventDefault();
    setIsSent(false);
    void sender
      .report({ handle: pupil.handle, reason, note })
      .then(() => setIsSent(true))
      .catch(() => undefined);
  }

  return (
    <section
      aria-labelledby="pupil-report-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6"
    >
      <h2 id="pupil-report-heading" className="m-0 type-subheading">
        {t('pupilReport.title', { name: pupil.displayName })}
      </h2>
      <p className="m-0 max-w-[34em] type-body text-ink-muted">{t('pupilReport.intro')}</p>
      <form noValidate onSubmit={send} className="flex flex-col gap-3">
        <SpaceRadioGroup
          legend={t('pupilReport.why')}
          value={reason}
          onChange={setReason}
          options={reasons.map((value) => ({ value, label: t(`pupilReport.reasons.${value}`) }))}
        />
        <div className="max-w-[480px]">
          <TextInput
            id="pupil-report-note"
            label={t('pupilReport.note')}
            placeholder={t('pupilReport.notePlaceholder')}
            value={note}
            maxLength={480}
            onChange={(changed) => setNote(changed.target.value)}
          />
        </div>
        <ReportOutcome
          failure={sender.failure?.failure ?? null}
          isSent={isSent}
          name={pupil.displayName}
        />
        <ButtonRow className="pt-1">
          <Button type="submit" disabled={sender.isRunning || isSent}>
            {t('pupilReport.send')}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t('pupilReport.cancel')}
          </Button>
        </ButtonRow>
      </form>
    </section>
  );
}
