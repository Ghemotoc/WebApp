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
      className="flex flex-col gap-2 rounded-card border border-border bg-surface px-6 py-4 shadow-card"
    >
      <h2 id="support-report-heading" className="m-0 type-body font-bold text-ink-heading">
        {t('list.reportHeading')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('list.reportText')}</p>
      <Link to="/report" className="w-fit type-body font-semibold text-link underline">
        {t('list.reportLink')}
      </Link>
    </section>
  );
}
