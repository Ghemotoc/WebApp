/**
 * DecisionsCard: "Decisions about your posts", the section that says moderation decisions always
 * arrive here and can't be switched off (story S1-E7-01, criterion 4; user story 4.1: "Decisions
 * always arrive here with the reasons and how to appeal, and can't be switched off"; board
 * E11-Notifications; DSA art. 17).
 *
 * As the board draws it: the subheading, the line in the body style and "My reports and
 * decisions", a text button to /my-reports (S1-E10-04), where each decision's reasons and the
 * appeal are. Who uses it: NotificationsPage.
 */
import { Link } from 'react-router';

import { buttonClassName } from '@/components/ui/buttonStyles';

import { useNotificationsTranslation } from '../registerNotificationsTranslations';

/**
 * Renders the section.
 *
 * @returns the section
 */
export function DecisionsCard() {
  const { t } = useNotificationsTranslation();
  return (
    <section aria-labelledby="notification-decisions-heading" className="flex flex-col gap-2">
      <h2 id="notification-decisions-heading" className="m-0 mb-2 type-subheading">
        {t('decisionsCard.heading')}
      </h2>
      <p className="m-0 type-body text-ink-muted">{t('decisionsCard.body')}</p>
      <Link to="/my-reports" className={buttonClassName({ variant: 'text' })}>
        {t('decisionsCard.link')}
      </Link>
    </section>
  );
}
