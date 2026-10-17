/**
 * AskForReviewLink: "Think we got this wrong?" under a refused name (story S1-E2-04: a moderator
 * can approve a false hit, for example a Romanian surname that contains a listed word).
 *
 * Until the Contact us form (S1-E14-04) and the account page's approve button (S1-E11-02) exist,
 * the link opens an email to the support address from src/config/brand.ts, with the name in the
 * subject line so a moderator can find it. The person's user ID is never put in the email.
 * Who uses it: HandleField and PenNameField.
 */
import { useTranslation } from 'react-i18next';

import { brand } from '@/config/brand';

/**
 * Renders the sentence and the link.
 *
 * @param props.name - the refused name, as typed
 * @returns the line
 */
export function AskForReviewLink({ name }: { name: string }) {
  const { t } = useTranslation('account');
  const subject = `${t('falseHit.emailSubject')}: ${name}`;
  const href = `mailto:${brand.supportEmail}?subject=${encodeURIComponent(subject)}`;
  return (
    <p className="m-0 text-[13px] text-meta">
      {t('falseHit.text')}{' '}
      <a href={href} className="text-link underline">
        {t('falseHit.link')}
      </a>
    </p>
  );
}
