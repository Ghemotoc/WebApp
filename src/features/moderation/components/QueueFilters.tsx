/**
 * QueueFilters: the drop-downs that narrow the queue: tier, status, reporter under 18 and how
 * the case was found (story S1-E10-03a; board 8.2's filter row).
 *
 * Who shows it: ModerationQueuePage. What it does: hands the changed filters up; the page reads
 * again at once. The board's Search, Reason and Claimed filters wait for S1-E10-03b.
 * Every select follows the one drop-down style (Definition of Done).
 */
import { useTranslation } from 'react-i18next';

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
  const { case_tier, case_status, case_source } = Constants.public.Enums;
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
  };
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
    </div>
  );
}
