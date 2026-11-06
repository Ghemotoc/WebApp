/**
 * CallsFilters: the search form of the Calls view in Staff › Logs (bundle LOGS-1, part d).
 *
 * Who shows it: CallsView. What it does: edits the typed filters and searches on submit, so
 * typing never fires a read per keystroke (and filtering by a person writes one audit row per
 * search, not per letter). Fields: failures only, the kind of call, part of its name and one
 * person's username. Plain components, no doodles.
 */
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { TextInput } from '@/components/ui/TextInput';

import { callKinds, type CallLogFilters } from '../../api/appLogs';

/** What the form needs. */
export interface CallsFiltersProps {
  filters: CallLogFilters;
  onChange: (filters: CallLogFilters) => void;
  onSearch: () => void;
}

/**
 * Renders the form.
 *
 * @returns the search form
 */
export function CallsFilters({ filters, onChange, onSearch }: CallsFiltersProps) {
  const { t } = useTranslation('staff');
  const kindOptions = [
    { value: '', label: t('logs.calls.allKinds') },
    ...callKinds.map((kind) => ({ value: kind, label: t(`logs.kinds.${kind}`) })),
  ];

  /** Searches without reloading the page. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form
      aria-label={t('logs.calls.searchForm')}
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4"
    >
      <Select
        id="calls-kind"
        label={t('logs.calls.kind')}
        placement="form"
        options={kindOptions}
        value={filters.kind}
        onChange={(kind) => onChange({ ...filters, kind })}
      />
      <TextInput
        id="calls-name"
        label={t('logs.calls.name')}
        hint={t('logs.calls.nameHint')}
        value={filters.nameContains}
        onChange={(event) => onChange({ ...filters, nameContains: event.target.value })}
      />
      <TextInput
        id="calls-person"
        label={t('logs.calls.person')}
        hint={t('logs.calls.personHint')}
        value={filters.personHandle}
        onChange={(event) => onChange({ ...filters, personHandle: event.target.value })}
      />
      <label className="flex min-h-11 items-center gap-2 self-end text-body">
        <input
          type="checkbox"
          className="size-5 accent-primary"
          checked={filters.onlyFailures}
          onChange={(event) => onChange({ ...filters, onlyFailures: event.target.checked })}
        />
        {t('logs.calls.onlyFailures')}
      </label>
      <div className="flex items-end">
        <Button type="submit">{t('logs.calls.search')}</Button>
      </div>
    </form>
  );
}
