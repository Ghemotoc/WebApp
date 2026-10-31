/**
 * ContactLine: "Questions? Contact us" under the parent's page (story S1-E2-03; board
 * ParentConsent.dc.html, the foot of the right side).
 *
 * Who shows it: ParentAnswerPage. What it links to: /contact (S1-E14-04).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/**
 * Renders the line.
 *
 * @returns the line
 */
export function ContactLine() {
  const { t } = useTranslation('account');
  return (
    <p className="m-0 text-sm text-meta">
      {t('parentConsent.parent.questions')}{' '}
      <Link to="/contact" className="text-link underline hover:text-link-hover">
        {t('parentConsent.parent.contactUs')}
      </Link>
    </p>
  );
}
