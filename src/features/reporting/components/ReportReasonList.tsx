/**
 * ReportReasonList: "What's wrong?", the eleven reasons as radio chips (story S1-E10-01).
 *
 * Board (ReportDialog): a fieldset with a legend, one chip per reason (the pill system: 36 px in
 * a 44 px tap area, a visible edge, the chosen one tinted and bold), and one plain line under the
 * chips saying what the chosen reason covers. The chips are real radio buttons, so arrow keys
 * move between them and screen readers announce the group (WCAG 2.2, 1.3.1 and 4.1.2).
 * Who shows it: ReportDialog. The list comes from the database enum (src/schemas/report.ts).
 */
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { reportReasons, type ReportReason } from '@/schemas/report';

/** What the list needs. */
interface ReportReasonListProps {
  chosen: ReportReason | null;
  onChoose: (reason: ReportReason) => void;
  /** Shown as the field's error, linked to the group. */
  errorMessage?: string;
}

/**
 * Renders the group.
 *
 * @returns the fieldset with the chips and the hint for the chosen reason
 */
export function ReportReasonList({ chosen, onChoose, errorMessage }: ReportReasonListProps) {
  const { t } = useTranslation('reporting');
  const hintId = 'report-reason-hint';
  const errorId = 'report-reason-error';
  return (
    <fieldset
      className="m-0 flex flex-col gap-3 border-0 p-0"
      aria-describedby={errorMessage === undefined ? hintId : `${hintId} ${errorId}`}
      aria-invalid={errorMessage === undefined ? undefined : true}
    >
      <legend className="mb-3 p-0 text-sm font-semibold text-ink">{t('dialog.whatIsWrong')}</legend>
      <div className="flex flex-wrap gap-2">
        {reportReasons.map((reason) => {
          const isChosen = reason === chosen;
          return (
            <label
              key={reason}
              className={cn(
                "relative inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm leading-none whitespace-nowrap after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-(--focus-ring)",
                isChosen
                  ? 'border-chip-on bg-chip-on font-bold text-chip-on-text'
                  : 'border-control-border bg-surface font-semibold text-heading hover:bg-tint',
              )}
            >
              <input
                type="radio"
                name="report-reason"
                value={reason}
                checked={isChosen}
                onChange={() => onChoose(reason)}
                className="sr-only"
              />
              {t(`reasons.${reason}.label`)}
            </label>
          );
        })}
      </div>
      <p id={hintId} className="m-0 min-h-5 text-sm text-meta">
        {chosen === null ? t('dialog.pickOne') : t(`reasons.${chosen}.hint`)}
      </p>
      {errorMessage !== undefined && (
        <p id={errorId} className="m-0 text-sm text-destructive">
          {errorMessage}
        </p>
      )}
    </fieldset>
  );
}
