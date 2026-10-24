/**
 * AskForReviewLink: "Think we got this wrong?" under a refused name (story S1-E2-04: a moderator
 * can approve a false hit, for example a Romanian surname that contains a listed word).
 *
 * The link opens the Contact us form (S1-E14-04) with the account topic and the name in the
 * message, so a moderator can find it; the approve button on the account page is S1-E11-02.
 * Who uses it: HandleField and PenNameField.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

/**
 * Renders the sentence and the link.
 *
 * @param props.name - the refused name, as typed
 * @returns the line
 */
export function AskForReviewLink({ name }: { name: string }) {
  const { t } = useTranslation('account');
  const message = `${t('falseHit.emailSubject')}: ${name}`;
  const href = `/contact?topic=account&message=${encodeURIComponent(message)}`;
  return (
    <p className="m-0 text-[13px] text-meta">
      {t('falseHit.text')}{' '}
      <Link to={href} className="text-link underline">
        {t('falseHit.link')}
      </Link>
    </p>
  );
}
