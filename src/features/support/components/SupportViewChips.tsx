/**
 * SupportViewChips: the support inbox's saved views with their counts: Assigned to me, Unassigned,
 * Open, Pending on user and Solved (story S1-E11-13 criterion 6; bundle ADMIN-2h3a). Each
 * view sets the status and assignee filters below it; the chip whose filters match is pressed.
 *
 * Who shows it: StaffSupportInboxPage. What it calls: nothing; the counts come from
 * useSupportInbox (admin_support_view_counts()).
 */
import { Chip } from '@/components/ui/Chip';

import {
  supportViews,
  type SupportInboxFilters,
  type SupportViewCounts,
} from '../api/staffSupportTickets';
import { useSupportTranslation } from '../registerSupportTranslations';

/**
 * Renders the views.
 *
 * @param props.filters - the inbox's filters now
 * @param props.counts - each view's count, once read
 * @param props.onChoose - sets the filters of the chosen view
 * @returns a labelled group of chips
 */
export function SupportViewChips({
  filters,
  counts,
  onChoose,
}: {
  filters: SupportInboxFilters;
  counts: SupportViewCounts | undefined;
  onChoose: (filters: SupportInboxFilters) => void;
}) {
  const { t } = useSupportTranslation();
  return (
    <div role="group" aria-label={t('staff.views.label')} className="flex flex-wrap gap-2">
      {supportViews.map((view) => {
        const isCurrent =
          view.filters.status === filters.status && view.filters.assigned === filters.assigned;
        const count = counts === undefined ? '' : ` (${String(counts[view.name])})`;
        return (
          <Chip
            key={view.name}
            isPressed={isCurrent}
            onPressedChange={() => onChoose(view.filters)}
          >
            {`${t(`staff.views.${view.name}`)}${count}`}
          </Chip>
        );
      })}
    </div>
  );
}
