/**
 * SpaceSortSelect: the "Latest activity" drop-down beside "More spaces" on the Spaces page
 * (bundle BOOKS-7, board F06, user story 7.6: "More spaces by Latest activity, Most members or
 * Newest").
 *
 * Who uses it: SpacesMoreSection. What it calls: the shared Select; the section then reads
 * space_list() again in the order picked.
 */
import { Select } from '@/components/ui/Select';

import { spaceSorts, type SpaceSort } from '../api/spaces';
import { useSpacesTranslation } from '../registerSpacesTranslations';

/** What the drop-down needs. */
export interface SpaceSortSelectProps {
  value: SpaceSort;
  onChange: (sort: SpaceSort) => void;
}

/**
 * Reads a drop-down value back as a sort, so an unknown one falls back to latest activity.
 *
 * @param value - the chosen option's value
 * @returns the sort
 */
function sortFrom(value: string): SpaceSort {
  const known = spaceSorts.find((sort) => sort === value);
  return known ?? 'latest';
}

/**
 * Renders the drop-down, its label read by screen readers only (the board shows none).
 *
 * @returns the drop-down
 */
export function SpaceSortSelect({ value, onChange }: SpaceSortSelectProps) {
  const { t } = useSpacesTranslation();
  const options = spaceSorts.map((sort) => ({ value: sort, label: t(`list.sort.${sort}`) }));
  return (
    <Select
      id="space-sort"
      label={t('list.sortLabel')}
      options={options}
      value={value}
      onChange={(chosen) => onChange(sortFrom(chosen))}
      placement="form"
    />
  );
}
