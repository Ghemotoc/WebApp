/**
 * SupportBreadcrumb: "Settings / Support requests / …" at the top of the member's support pages
 * (user stories bundle 10, boards J15, J20 and J21; it replaces the "‹ Settings" back link of
 * bundle G11c).
 *
 * On the list the trail ends at "Support requests"; on a request or the form it adds that page as
 * the last step.
 * Who shows it: MySupportPage, NewSupportRequestPage and MySupportTicketPage. What it calls:
 * Breadcrumb.
 */
import { Breadcrumb, type BreadcrumbStep } from '@/components/ui/Breadcrumb';

import { useSupportTranslation } from '../registerSupportTranslations';

/** What the trail needs. */
export interface SupportBreadcrumbProps {
  /** The page below the list ("Ask for help", "Request 2041"); left out on the list itself. */
  current?: string;
}

/**
 * Renders the trail.
 *
 * @param props.current - the page below the list, if any
 * @returns the breadcrumb
 */
export function SupportBreadcrumb({ current }: SupportBreadcrumbProps) {
  const { t } = useSupportTranslation();
  // Step 1: Settings always leads back to its Support group.
  const steps: BreadcrumbStep[] = [{ label: t('breadcrumb.settings'), to: '/settings#support' }];
  // Step 2: the list is a link only when a page below it is open.
  if (current === undefined) {
    steps.push({ label: t('list.title') });
  } else {
    steps.push({ label: t('list.title'), to: '/support' }, { label: current });
  }
  return <Breadcrumb label={t('breadcrumb.label')} steps={steps} />;
}
