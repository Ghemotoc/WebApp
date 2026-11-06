/**
 * NotificationFilters: the chips over the list: All, Replies, Follows, Stories and Staff, each
 * with its count (story S1-E7-01; board 6.2).
 *
 * One choice at a time; the chosen chip is plum with a tick and aria-pressed (DoD pill system),
 * its count in a gold bubble. Who uses it: NotificationsPage.
 */
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/utils';

import type { NotificationCategory, NotificationsPage } from '../api/notifications';
import { useNotificationsTranslation } from '../registerNotificationsTranslations';

/** A filter: one category, or all of them. */
export type NotificationFilter = 'all' | NotificationCategory;

/** The chips in the board's order. */
const filters: NotificationFilter[] = ['all', 'replies', 'follows', 'stories', 'staff'];

/** What the filters need. */
export interface NotificationFiltersProps {
  counts: NotificationsPage['counts'];
  chosen: NotificationFilter;
  onChoose: (filter: NotificationFilter) => void;
}

/**
 * Renders the chips.
 *
 * @returns the group of chips
 */
export function NotificationFilters({ counts, chosen, onChoose }: NotificationFiltersProps) {
  const { t } = useNotificationsTranslation();
  return (
    <div role="group" aria-label={t('filters.label')} className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Chip key={filter} isPressed={chosen === filter} onPressedChange={() => onChoose(filter)}>
          {t(`filters.${filter}`)}
          <span
            className={cn(
              'inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-xs leading-none font-bold',
              chosen === filter
                ? 'bg-gold text-on-gold'
                : 'border border-(--pill-plum-border) bg-(--pill-plum-bg) text-(--pill-plum-text)',
            )}
          >
            {counts[filter]}
          </span>
        </Chip>
      ))}
    </div>
  );
}
