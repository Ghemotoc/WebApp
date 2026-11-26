/**
 * NotificationFilters: the switch over the list: Everything, Replies, Follows, Stories and From
 * {{productName}}, each with its count (story S1-E7-01; user story 4.1: "Tabs filter by kind
 * with a count each; Everything is first"; board E11-Notifications).
 *
 * The board's track of tabs is the shared SegmentedControl: one choice at a time, a real radio
 * group (arrow keys move, the picked one is bold on the bubble, so the choice never rests on
 * colour alone), each label "Replies · 3". The staff kinds read "From <product name>", the
 * name coming from the brand settings.
 * Who uses it: NotificationsPage. What it calls: SegmentedControl.
 */
import { SegmentedControl } from '@/components/ui/SegmentedControl';

import type { NotificationCategory, NotificationsPage } from '../api/notifications';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

/** A filter: one category, or all of them. */
export type NotificationFilter = 'all' | NotificationCategory;

/** The tabs in the board's order. */
const filters: NotificationFilter[] = ['all', 'replies', 'follows', 'stories', 'staff'];

/** What the filters need. */
export interface NotificationFiltersProps {
  counts: NotificationsPage['counts'];
  chosen: NotificationFilter;
  onChoose: (filter: NotificationFilter) => void;
}

/**
 * Renders the switch.
 *
 * @returns the radio group
 */
export function NotificationFilters({ counts, chosen, onChoose }: NotificationFiltersProps) {
  const { t } = useNotificationsTranslation();
  const options = filters.map((filter) => ({
    value: filter,
    label: t('filters.withCount', { name: t(`filters.${filter}`), count: counts[filter] }),
  }));
  return (
    <SegmentedControl
      legend={t('filters.label')}
      isLegendVisible={false}
      name="notification-filter"
      options={options}
      value={chosen}
      onChange={onChoose}
    />
  );
}
