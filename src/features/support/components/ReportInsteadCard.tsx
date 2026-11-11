/**
 * ReportInsteadCard: "To report a story, a comment or something illegal" on the support pages
 * (bundle G11c; the canvas's Support board). A support request is not a report: reports go
 * straight to the moderators (S1-E10-02), so this card sends people to the report form.
 * Who shows it: MySupportPage. What it calls: React Router's Link to /report.
 */
import { Link } from 'react-router';

import { useSupportTranslation } from '../registerSupportTranslations';

/**
 * Renders the card.
 *
 * @returns the section
 */
export function ReportInsteadCard() {
  const { t } = useSupportTranslation();
  return (
    <section
      aria-labelledby="support-report-heading"
      className="flex flex-col gap-1.5 rounded-card border border-border bg-surface px-6 py-5 shadow-card"
    >
      <h2 id="support-report-heading" className="m-0 text-base font-bold text-heading">
        {t('list.reportHeading')}
      </h2>
      <p className="m-0 text-sm text-meta">{t('list.reportText')}</p>
      <Link to="/report" className="w-fit text-sm font-semibold text-link underline">
        {t('list.reportLink')}
      </Link>
    </section>
  );
}
