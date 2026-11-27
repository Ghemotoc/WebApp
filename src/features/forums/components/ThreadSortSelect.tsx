/**
 * ThreadSortSelect: the "Latest activity" drop-down beside a thread list's heading (bundle BOOKS-7,
 * boards F03 and F08, user stories 7.3 and 7.8).
 *
 * Who uses it: ThreadList, on a forum's page and a space's page. What it calls: the shared Select;
 * the list reads forum_thread_list() again in the order picked.
 */
import { Select } from '@/components/ui/Select';

import { threadSorts, type ThreadSort } from '../api/forumThreads';
import { useForumsTranslation } from '../registerForumsTranslations';

/** What the drop-down needs. */
export interface ThreadSortSelectProps {
  /** Unique id; a page with two lists gives each its own. */
  id: string;
  value: ThreadSort;
  onChange: (sort: ThreadSort) => void;
}

/**
 * Reads a drop-down value back as a sort, so an unknown one falls back to latest activity.
 *
 * @param value - the chosen option's value
 * @returns the sort
 */
function sortFrom(value: string): ThreadSort {
  const known = threadSorts.find((sort) => sort === value);
  return known ?? 'latest';
}

/**
 * Renders the drop-down, its label read by screen readers only (the board shows none).
 *
 * @returns the drop-down
 */
export function ThreadSortSelect({ id, value, onChange }: ThreadSortSelectProps) {
  const { t } = useForumsTranslation();
  const options = threadSorts.map((sort) => ({ value: sort, label: t(`list.sort.${sort}`) }));
  return (
    <Select
      id={id}
      label={t('list.sortLabel')}
      options={options}
      value={value}
      onChange={(chosen) => onChange(sortFrom(chosen))}
      placement="form"
    />
  );
}
