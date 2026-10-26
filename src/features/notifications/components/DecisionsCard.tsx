/**
 * DecisionsCard: "Decisions about your posts", the side card that says moderation decisions
 * always arrive here and can't be switched off (story S1-E7-01, criterion 4; board 6.2; DSA
 * art. 17).
 *
 * Board values: a warm panel, a 24 px radius, the shield icon beside a 20 px heading, and the
 * "My reports and decisions" link (S1-E10-04). Appeals in the app wait for S1-E10-07
 * (docs/board-fixes.md). Who uses it: NotificationsPage.
 */
import { Link } from 'react-router';

import shieldIcon from '@/assets/icons/shield.svg';

import { useNotificationsTranslation } from '../registerNotificationsTranslations';

/**
 * Renders the card.
 *
 * @returns the section
 */
export function DecisionsCard() {
  const { t } = useNotificationsTranslation();
  return (
    <section
      aria-labelledby="notification-decisions-heading"
      className="flex flex-col gap-2.5 rounded-card border border-panel-border bg-panel p-6"
    >
      <h2
        id="notification-decisions-heading"
        className="m-0 flex items-center gap-2.5 text-xl font-bold text-ink"
      >
        <img
          src={shieldIcon}
          alt=""
          aria-hidden="true"
          width={26}
          height={26}
          className="block size-[26px] flex-none"
        />
        {t('decisionsCard.heading')}
      </h2>
      <p className="m-0 text-[15px] leading-relaxed text-body">{t('decisionsCard.body')}</p>
      <Link to="/my-reports" className="w-fit text-[15px] font-semibold text-link underline">
        {t('decisionsCard.link')}
      </Link>
    </section>
  );
}
