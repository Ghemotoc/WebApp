/**
 * ContactLine: "Questions? Contact us" under the parent's page (story S1-E2-03; board
 * ParentConsent.dc.html, the foot of the right side).
 *
 * Who shows it: ParentAnswerPage. What it links to: /contact (S1-E14-04).
 */
import { Link } from 'react-router';
import { useParentConsentTranslation } from '../registerParentConsentTranslations';

/**
 * Renders the line.
 *
 * @returns the line
 */
export function ContactLine() {
  const { t } = useParentConsentTranslation();
  return (
    <p className="m-0 type-body text-ink-muted">
      {t('parent.questions')}{' '}
      <Link to="/contact" className="text-link underline hover:text-link-hover">
        {t('parent.contactUs')}
      </Link>
    </p>
  );
}
