/**
 * QueueFilters: the drop-downs that narrow the queue: tier, status, reporter under 18, how the
 * case was found (story S1-E10-03a), and the reason, who claimed it and a search by case
 * reference or username (S1-E10-03b; board 8.2's filter row).
 *
 * Who shows it: ModerationQueuePage. What it does: hands the changed filters up; the page reads
 * again at once.
 * Every select follows the one drop-down style (Definition of Done).
 */
import { useTranslation } from 'react-i18next';

import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Constants } from '@/lib/database.types';

import type { QueueFilters as Filters } from '../api/moderationQueue';

/** What the form needs. */
export interface QueueFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

/** A translator for option labels. */
type Translate = (key: string) => string;

/**
 * The choices of each drop-down, with "all" first (status: open, decided, then both).
 *
 * @param t - the moderation translator
 * @returns the four option lists
 */
function filterOptions(t: Translate) {
  const { case_tier, case_status, case_source, report_reason } = Constants.public.Enums;
  return {
    tier: [
      { value: '', label: t('queue.filters.allTiers') },
      ...case_tier.map((tier) => ({ value: tier, label: t(`tiers.${tier}`) })),
    ],
    status: [
      ...case_status.map((status) => ({ value: status, label: t(`statuses.${status}`) })),
      { value: '', label: t('queue.filters.allStatuses') },
    ],
    reporterUnder18: [
      { value: '', label: t('queue.filters.under18All') },
      { value: 'yes', label: t('queue.filters.under18Yes') },
      { value: 'no', label: t('queue.filters.under18No') },
    ],
    source: [
      { value: '', label: t('queue.filters.allSources') },
      ...case_source.map((source) => ({ value: source, label: t(`sources.${source}`) })),
    ],
    reason: [
      { value: '', label: t('queue.filters.allReasons') },
      ...report_reason.map((reason) => ({ value: reason, label: t(`reasons.${reason}`) })),
    ],
    claimed: [
      { value: '', label: t('queue.filters.claimedAll') },
      { value: 'mine', label: t('queue.filters.claimedMine') },
      { value: 'anyone', label: t('queue.filters.claimedAnyone') },
      { value: 'nobody', label: t('queue.filters.claimedNobody') },
    ],
  };
}

/**
 * The second row: reason, who claimed it, and the search (S1-E10-03b).
 *
 * @returns the drop-downs and the search field
 */
function MoreFilters({ filters, onChange }: QueueFiltersProps) {
  const { t } = useTranslation('moderation');
  const options = filterOptions(t);
  return (
    <>
      <Select
        id="queue-reason"
        label={t('queue.filters.reason')}
        isLabelVisible
        value={filters.reason}
        onChange={(value) => onChange({ ...filters, reason: value as Filters['reason'] })}
        options={options.reason}
      />
      <Select
        id="queue-claimed"
        label={t('queue.filters.claimed')}
        isLabelVisible
        value={filters.claimed}
        onChange={(value) => onChange({ ...filters, claimed: value as Filters['claimed'] })}
        options={options.claimed}
      />
      <div className="w-full sm:w-[320px]">
        <SearchInput
          id="queue-search"
          label={t('queue.filters.search')}
          placeholder={t('queue.filters.searchPlaceholder')}
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </div>
    </>
  );
}

/**
 * Renders the four drop-downs.
 *
 * @returns the filter row
 */
export function QueueFilters({ filters, onChange }: QueueFiltersProps) {
  const { t } = useTranslation('moderation');
  const options = filterOptions(t);

  /** One filter's change, kept with the others. */
  function setFilter(field: keyof Filters, value: string) {
    onChange({ ...filters, [field]: value });
  }

  return (
    <div
      role="group"
      aria-label={t('queue.filtersLabel')}
      className="flex flex-wrap items-end gap-4 rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <Select
        id="queue-tier"
        label={t('queue.filters.tier')}
        isLabelVisible
        value={filters.tier}
        onChange={(value) => setFilter('tier', value)}
        options={options.tier}
      />
      <Select
        id="queue-status"
        label={t('queue.filters.status')}
        isLabelVisible
        value={filters.status}
        onChange={(value) => setFilter('status', value)}
        options={options.status}
      />
      <Select
        id="queue-under-18"
        label={t('queue.filters.under18')}
        isLabelVisible
        value={filters.reporterUnder18}
        onChange={(value) => setFilter('reporterUnder18', value)}
        options={options.reporterUnder18}
      />
      <Select
        id="queue-source"
        label={t('queue.filters.source')}
        isLabelVisible
        value={filters.source}
        onChange={(value) => setFilter('source', value)}
        options={options.source}
      />
      <MoreFilters filters={filters} onChange={onChange} />
    </div>
  );
}
