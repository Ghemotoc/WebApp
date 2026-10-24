/**
 * CaseReports: "Reports", every report grouped on a case, with what each reporter wrote, and
 * "Pause reporting" on each reporter (stories S1-E10-03a and S1-E10-06; board 8.3's "Reporter's
 * note" and the reporter panel's "Pause reporting").
 *
 * Reporters appear by username and age group to staff (the reported account never learns who
 * reported it). An order or a picture check has no reports, and says so. Pausing a reporter
 * (Q83: when their reports are unfounded again and again) asks for a reason and lasts
 * reporting_pause_days (30, Q7). Each report can also ask its reporter for more details, and a
 * copied-work report shows its passage and source side by side (S1-E10-08).
 * Who shows it: CasePage. What it calls: useSanctions.pause().
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';

import type { CaseReport } from '../api/moderationQueue';
import type { useSanctions } from '../hooks/useSanctions';

import { AskForDetails, CopiedWorkComparison } from './CopiedWorkReportParts';
import { ReasonForm } from './ReasonForm';

/** useSanctions's result, passed down once. */
type Sanctions = ReturnType<typeof useSanctions>;

/** How long a reporting pause lasts, the same as the setting reporting_pause_days (Q7). */
const reportingPauseDays = 30;

/**
 * One report: the reason, who sent it, what they wrote, and the Pause reporting action.
 *
 * @returns a list item
 */
function ReportCard({
  report,
  sanctions,
  isCaseOpen,
}: {
  report: CaseReport;
  sanctions: Sanctions;
  isCaseOpen: boolean;
}) {
  const { t, i18n } = useTranslation('moderation');
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const handle = report.reporterHandle ?? t('case.noHandle');
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(report.createdAt));
  return (
    <li className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
      <p className="m-0 font-semibold text-heading">{t(`reasons.${report.reason}`)}</p>
      <p className="m-0 text-sm text-meta">
        {t('case.reportBy', {
          reference: report.reference,
          handle,
          ageBand: t(`ageBands.${report.reporterAgeBand}`),
          when,
        })}
      </p>
      <blockquote className="m-0 border-l-4 border-(--pill-gold-border) pl-3 text-body">
        {report.details === null || report.details === '' ? t('case.noDetails') : report.details}
      </blockquote>
      {/* A copied-work report: the passage and the source side by side (S1-E10-08). */}
      {report.reason === 'copied_published_work' && <CopiedWorkComparison report={report} />}
      <AskForDetails report={report} isCaseOpen={isCaseOpen} />
      {report.reporterHandle !== null && !isPauseOpen && (
        <div>
          <Button
            variant="secondary"
            aria-label={t('pause.openLabel', { handle })}
            onClick={() => setIsPauseOpen(true)}
          >
            {t('pause.open')}
          </Button>
        </div>
      )}
      {report.reporterHandle !== null && isPauseOpen && (
        <ReasonForm
          id={`pause-${report.reference}`}
          label={t('pause.reason')}
          confirmLabel={t('pause.confirm', { days: reportingPauseDays })}
          isBusy={sanctions.isBusy}
          onConfirm={async (reason) => {
            await sanctions.pause(handle, reason);
            setIsPauseOpen(false);
          }}
          onCancel={() => setIsPauseOpen(false)}
        />
      )}
    </li>
  );
}

/**
 * Renders the section.
 *
 * @param props.reports - the case's reports, oldest first
 * @param props.sanctions - useSanctions's result, for the pause action
 * @param props.isCaseOpen - whether the case is open, so a moderator may still ask for details
 * @returns the section
 */
export function CaseReports({
  reports,
  sanctions,
  isCaseOpen,
}: {
  reports: CaseReport[];
  sanctions: Sanctions;
  isCaseOpen: boolean;
}) {
  const { t } = useTranslation('moderation');
  return (
    <section aria-labelledby="case-reports-heading" className="flex flex-col gap-4">
      <h2 id="case-reports-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
        {t('case.reportsHeading')}
      </h2>
      {reports.length === 0 && <p className="m-0 text-body">{t('case.noReports')}</p>}
      {sanctions.pauseFailure !== null && (
        <Notice tone="error">{t(`failures.${sanctions.pauseFailure}`)}</Notice>
      )}
      {sanctions.hasPaused && <Notice tone="success">{t('pause.done')}</Notice>}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {reports.map((report) => (
          <ReportCard
            key={report.reference}
            report={report}
            sanctions={sanctions}
            isCaseOpen={isCaseOpen}
          />
        ))}
      </ul>
      {reports.length > 0 && <p className="m-0 text-sm text-meta">{t('case.anonymous')}</p>}
    </section>
  );
}
