/**
 * AuditLogFilters: the search form on the Audit log screen (story S1-E11-01).
 *
 * Who shows it: AuditLogPage. What it does: edits the typed filters and calls search() on submit;
 * the page only reads again when Search is pressed, so typing never fires a query per keystroke.
 * Fields: the start of the action name, the staff member's username, the account's user ID
 * (staff may search by ID, architecture 1.6) and a date range. Plain components, no doodles.
 */
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';

import type { AuditLogFilters as Filters } from '../api/auditLog';

/** What the form needs. */
export interface AuditLogFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  onSearch: () => void;
}

/**
 * Renders the form.
 *
 * @returns the search form
 */
export function AuditLogFilters({ filters, onChange, onSearch }: AuditLogFiltersProps) {
  const { t } = useTranslation('staff');

  /** One field's change, kept in the typed filters. */
  function setField(field: keyof Filters, value: string) {
    onChange({ ...filters, [field]: value });
  }

  /** Searches without reloading the page. */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form
      aria-label={t('auditLog.searchForm')}
      onSubmit={handleSubmit}
      className="grid grid-cols-1 gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:grid-cols-2 lg:grid-cols-3"
    >
      <TextInput
        id="audit-action"
        label={t('auditLog.action')}
        hint={t('auditLog.actionHint')}
        value={filters.actionPrefix}
        onChange={(event) => setField('actionPrefix', event.target.value)}
      />
      <TextInput
        id="audit-staff"
        label={t('auditLog.staffMember')}
        hint={t('auditLog.staffMemberHint')}
        value={filters.staffHandle}
        onChange={(event) => setField('staffHandle', event.target.value)}
      />
      <TextInput
        id="audit-target"
        label={t('auditLog.targetUserId')}
        hint={t('auditLog.targetUserIdHint')}
        value={filters.targetUserId}
        onChange={(event) => setField('targetUserId', event.target.value)}
      />
      <TextInput
        id="audit-from"
        type="date"
        label={t('auditLog.fromDate')}
        value={filters.fromDate}
        onChange={(event) => setField('fromDate', event.target.value)}
      />
      <TextInput
        id="audit-to"
        type="date"
        label={t('auditLog.toDate')}
        value={filters.toDate}
        onChange={(event) => setField('toDate', event.target.value)}
      />
      <div className="flex items-end">
        <Button type="submit">{t('auditLog.search')}</Button>
      </div>
    </form>
  );
}
