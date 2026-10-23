/**
 * CaseReports: "Reports", every report grouped on a case, with what each reporter wrote (story
 * S1-E10-03a; board 8.3's "Reporter's note").
 *
 * Reporters appear by username and age group to staff (the reported account never learns who
 * reported it). An order or a picture check has no reports, and says so.
 * Who shows it: CasePage.
 */
import { useTranslation } from 'react-i18next';

import type { CaseReport } from '../api/moderationQueue';

/**
 * Renders the section.
 *
 * @param props.reports - the case's reports, oldest first
 * @returns the section
 */
export function CaseReports({ reports }: { reports: CaseReport[] }) {
  const { t, i18n } = useTranslation('moderation');
  const whenText = (isoTime: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(isoTime),
    );
  return (
    <section aria-labelledby="case-reports-heading" className="flex flex-col gap-4">
      <h2 id="case-reports-heading" className="m-0 font-heading text-[24px] font-bold text-heading">
        {t('case.reportsHeading')}
      </h2>
      {reports.length === 0 && <p className="m-0 text-body">{t('case.noReports')}</p>}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {reports.map((report) => (
          <li
            key={report.reference}
            className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4"
          >
            <p className="m-0 font-semibold text-heading">{t(`reasons.${report.reason}`)}</p>
            <p className="m-0 text-sm text-meta">
              {t('case.reportBy', {
                reference: report.reference,
                handle: report.reporterHandle ?? t('case.noHandle'),
                ageBand: t(`ageBands.${report.reporterAgeBand}`),
                when: whenText(report.createdAt),
              })}
            </p>
            <blockquote className="m-0 border-l-4 border-(--pill-gold-border) pl-3 text-body">
              {report.details === null || report.details === ''
                ? t('case.noDetails')
                : report.details}
            </blockquote>
          </li>
        ))}
      </ul>
      {reports.length > 0 && <p className="m-0 text-sm text-meta">{t('case.anonymous')}</p>}
    </section>
  );
}
