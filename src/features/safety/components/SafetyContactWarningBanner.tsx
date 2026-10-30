/**
 * SafetyContactWarningBanner: the warning at the top of every staff page while a safety contact
 * has gone 45 days without a check (story S1-E10-13, part b, criterion 8: "the owner sees a warning
 * in the admin site until they are checked").
 *
 * Shown to staff who can see the safety contacts area; it names how many contacts and links to the
 * page where they are confirmed. Nothing shows when all are fresh.
 * Who shows it: StaffLayout. What it calls: useSafetyContactWarnings.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';

import { useSafetyContactWarnings } from '../hooks/useSafetyContactWarnings';
import { registerSafetyTranslations } from '../registerSafetyTranslations';

/**
 * Renders the banner.
 *
 * @param props.canSee - whether the person has the safety contacts area
 * @returns the warning, or nothing
 */
export function SafetyContactWarningBanner({ canSee }: { canSee: boolean }) {
  const { i18n } = useTranslation();
  registerSafetyTranslations(i18n);
  const { t } = useTranslation('safety');
  const { warnings } = useSafetyContactWarnings(canSee);
  if (warnings.length === 0) return null;
  const oldest = Math.max(...warnings.map((warning) => warning.daysSince));
  return (
    <div className="px-4 pt-4 sm:px-8">
      <Notice tone="warning">
        {t('admin.warning', { count: warnings.length, days: oldest })}{' '}
        <Link to="/staff/safety-contacts" className="font-semibold text-link underline">
          {t('admin.warningLink')}
        </Link>
      </Notice>
    </div>
  );
}
