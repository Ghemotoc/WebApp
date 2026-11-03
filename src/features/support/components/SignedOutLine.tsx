/**
 * SignedOutLine: what the support pages say to a signed-out visitor: log in, or use Contact us
 * without an account (story S1-E11-13; bundle ADMIN-2h1).
 *
 * Who shows it: MySupportPage and NewSupportRequestPage.
 */
import { Link } from 'react-router';

import { useSupportTranslation } from '../registerSupportTranslations';

/**
 * Renders the line.
 *
 * @returns a paragraph with the two links
 */
export function SignedOutLine() {
  const { t } = useSupportTranslation();
  return (
    <p className="m-0 text-body">
      {t('signedOut')}{' '}
      <Link to="/sign-in" className="text-link underline">
        {t('logIn')}
      </Link>
      {' · '}
      <Link to="/contact" className="text-link underline">
        {t('contactUs')}
      </Link>
    </p>
  );
}
