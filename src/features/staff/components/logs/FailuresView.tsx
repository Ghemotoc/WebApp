/**
 * FailuresView: the failed calls of the last 7 days, grouped by what failed and how, most first
 * (bundle LOGS-1, part d; Robert, 6 Nov 2026: "where it failed").
 *
 * Who shows it: LogsPage. What it calls: useCallFailures → admin_call_failures().
 * Each row: the call, its status and error code, how many times it failed, how many accounts
 * hit it, and when it first and last failed. To see the calls themselves, staff search the Calls
 * view by the call's name with "Only failures" ticked.
 */
import { useTranslation } from 'react-i18next';

import { useCallFailures } from '../../hooks/useCallFailures';

import { logTime } from './logTime';
import { LogsFailureNote } from './LogsFailureNote';
import { LogTable } from './LogTable';

/**
 * Renders the view.
 *
 * @returns the grouped failures
 */
export function FailuresView() {
  const { t, i18n } = useTranslation('staff');
  const failures = useCallFailures();
  if (failures.loadFailure !== null) return <LogsFailureNote failure={failures.loadFailure} />;
  if (failures.isLoading) return <p className="m-0 text-meta">{t('logs.loading')}</p>;

  const headings = ['call', 'result', 'failures', 'accounts', 'firstSeen', 'lastSeen'].map(
    (column) => t(`logs.failures.columns.${column}`),
  );
  const rows = failures.groups.map((group) => ({
    key: `${group.kind}|${group.name}|${String(group.status)}|${group.errorCode ?? ''}`,
    cells: [
      `${t(`logs.kinds.${group.kind}`)} · ${group.name}`,
      group.status === 0
        ? t('logs.calls.noAnswer')
        : `${String(group.status)}${group.errorCode === null ? '' : ` · ${group.errorCode}`}`,
      String(group.failures),
      String(group.accounts),
      logTime(group.firstSeen, i18n.language),
      logTime(group.lastSeen, i18n.language),
    ],
  }));
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-body">{t('logs.failures.intro')}</p>
      <LogTable
        caption={t('logs.views.failures')}
        headings={headings}
        rows={rows}
        emptyNote={t('logs.failures.none')}
      />
    </div>
  );
}
