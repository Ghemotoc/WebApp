/**
 * ReportInsteadCard: "To report a story, a comment or something illegal" beside the support
 * requests (bundle G11c; unboxed since user stories bundle 10, board J15). A support request is
 * not a report: reports go straight to the moderators (S1-E10-02), so this block sends people to
 * the report form.
 * Who shows it: MySupportPage. What it calls: React Router's Link to /report.
 */
import { Link } from 'react-router';

import { useSupportTranslation } from '../registerSupportTranslations';

/**
 * Renders the block.
 *
 * @returns the aside
 */
export function ReportInsteadCard() {
  const { t } = useSupportTranslation();
  return (
    <aside aria-labelledby="support-report-heading" className="flex flex-col gap-2">
      <h2
        id="support-report-heading"
        className="m-0 font-heading type-subheading font-bold text-ink-heading"
      >
        {t('list.reportHeading')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('list.reportText')}</p>
      <Link to="/report" className="w-fit type-body font-semibold text-ink-heading underline">
        {t('list.reportLink')}
      </Link>
    </aside>
  );
}
