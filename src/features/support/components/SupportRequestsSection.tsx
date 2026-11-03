/**
 * SupportRequestsSection: "Your support requests" on Settings (id support): the way to ask the
 * support team for help and to read their answers (story S1-E11-13 criterion 2; bundle
 * ADMIN-2h1).
 *
 * Who shows it: SettingsPage. What it calls: nothing; it links to /support.
 * No doodles: it is a help panel.
 */
import { Link } from 'react-router';

import { useSupportTranslation } from '../registerSupportTranslations';

/**
 * Renders the section.
 *
 * @returns the section
 */
export function SupportRequestsSection() {
  const { t } = useSupportTranslation();
  return (
    <section
      id="support"
      aria-labelledby="settings-support-heading"
      className="flex scroll-mt-24 flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="settings-support-heading"
        className="m-0 font-heading text-[22px] font-bold text-heading"
      >
        {t('settings.heading')}
      </h2>
      <p className="m-0 text-body">{t('settings.intro')}</p>
      <Link to="/support" className="w-fit font-semibold text-link underline">
        {t('settings.open')}
      </Link>
    </section>
  );
}
