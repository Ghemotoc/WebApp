/**
 * MailBreadcrumb: "Settings / Moderator mail / …" at the top of the member's moderator mail pages
 * (user stories bundle 10, boards J22, J23 and J24; it replaces the "‹ Settings" back link of
 * bundle G8c).
 *
 * On the list the trail ends at "Moderator mail"; on a thread or the form it adds that page as the
 * last step.
 * Who shows it: MyMailPage, NewMailPage and MailThreadPage. What it calls: Breadcrumb.
 */
import { Breadcrumb, type BreadcrumbStep } from '@/components/ui/Breadcrumb';

import { useMailTranslation } from '../registerMailTranslations';

/** What the trail needs. */
export interface MailBreadcrumbProps {
  /** The page below the list ("Write to the moderators", "M-000231"); left out on the list. */
  current?: string;
}

/**
 * Renders the trail.
 *
 * @param props.current - the page below the list, if any
 * @returns the breadcrumb
 */
export function MailBreadcrumb({ current }: MailBreadcrumbProps) {
  const { t } = useMailTranslation();
  // Step 1: Settings, where the moderator mail is linked from.
  const steps: BreadcrumbStep[] = [{ label: t('breadcrumb.settings'), to: '/settings' }];
  // Step 2: the list is a link only when a page below it is open.
  if (current === undefined) {
    steps.push({ label: t('list.title') });
  } else {
    steps.push({ label: t('list.title'), to: '/moderator-mail' }, { label: current });
  }
  return <Breadcrumb label={t('breadcrumb.label')} steps={steps} />;
}
