/**
 * DecisionsCard: "Decisions about your posts", the side card that says moderation decisions
 * always arrive here and can't be switched off (story S1-E7-01, criterion 4; board 6.2; DSA
 * art. 17).
 *
 * Board values (liquid glass redesign, bundle G8d): a glass card with 28 px corners, the shield
 * line icon beside the heading, and the "Reports and decisions" link (S1-E10-04). Appeals in the app wait for S1-E10-07
 * (docs/board-fixes.md). Who uses it: NotificationsPage.
 */
import { Link } from 'react-router';

import { ActionIcon } from '@/components/icons/ActionIcon';

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
      className="flex flex-col gap-2.5 rounded-[28px] border border-border bg-surface p-6 shadow-card"
    >
      <h2
        id="notification-decisions-heading"
        className="m-0 flex items-center gap-2.5 font-heading text-lg font-bold text-heading"
      >
        <ActionIcon name="shield" size={20} className="flex-none" />
        {t('decisionsCard.heading')}
      </h2>
      <p className="m-0 text-sm leading-relaxed text-body">{t('decisionsCard.body')}</p>
      <Link to="/my-reports" className="w-fit text-sm font-semibold text-link underline">
        {t('decisionsCard.link')}
      </Link>
    </section>
  );
}
