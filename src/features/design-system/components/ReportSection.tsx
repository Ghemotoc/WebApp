/**
 * ReportSection: the Report button and its dialog on the /design page (story S1-E10-01).
 *
 * Why here: the shared ReportButton is the one component every content screen adds, and until
 * the story and chapter screens (Lane A) and the profile page (S1-E5-05) exist, this is where a
 * person can see and try it. The sample item is the adult_writer persona's profile, so a signed-in
 * test persona can send a real report to the local database.
 * Who shows it: DesignPage. What it calls: ReportButton (src/features/reporting/).
 */
import { useTranslation } from 'react-i18next';

import { ReportButton } from '@/features/reporting/components/ReportButton';

import { DesignSection } from './DesignSection';

/**
 * Renders the section.
 *
 * @returns the panel with one Report button on a sample profile
 */
export function ReportSection() {
  const { t } = useTranslation('design');
  return (
    <DesignSection id="report" title={t('report.title')}>
      <p className="m-0 max-w-[720px] text-body">{t('report.intro')}</p>
      <div className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface p-5">
        <span className="text-body">{t('report.sampleItem')}</span>
        <ReportButton itemType="profile" itemReference="adult_writer" itemLabel="@adult_writer" />
      </div>
    </DesignSection>
  );
}
