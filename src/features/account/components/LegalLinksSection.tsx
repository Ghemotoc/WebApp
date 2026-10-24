/**
 * LegalLinksSection: the Legal panel of Settings, with links to the Legal centre (story S1-E2-04,
 * decided 17 Oct 2026, 19:43, Q8) and to the contact and company details, one tap away as the
 * story asks (S1-E14-02).
 *
 * Who shows it: SettingsPage.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/**
 * Renders the panel.
 *
 * @returns the Legal section
 */
export function LegalLinksSection() {
  const { t } = useTranslation('account');
  return (
    <section
      aria-labelledby="settings-legal-heading"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-[clamp(20px,5vw,32px)] shadow-card"
    >
      <h2
        id="settings-legal-heading"
        className="m-0 font-heading text-[24px] font-bold text-heading"
      >
        {t('settings.legalHeading')}
      </h2>
      <p className="m-0 text-body">{t('settings.legalText')}</p>
      <Link
        to="/legal/terms"
        className="inline-flex min-h-11 items-center self-start text-link underline"
      >
        {t('settings.legalLink')}
      </Link>
      {/* Contact us, the form, one tap from Settings (S1-E14-04). */}
      <Link
        to="/contact"
        className="inline-flex min-h-11 items-center self-start text-link underline"
      >
        {t('settings.contactUsLink')}
      </Link>
      {/* The contact points one tap from Settings (S1-E14-02; DSA art. 11 and 12). */}
      <Link
        to="/legal/contact"
        className="inline-flex min-h-11 items-center self-start text-link underline"
      >
        {t('settings.contactLink')}
      </Link>
    </section>
  );
}
