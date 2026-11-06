/**
 * CrashesView: errors the browser hit that nothing in the app caught, in the last 7 days (bundle
 * LOGS-1, part d). The log is S1-E1-05's; until now owner and admin read it only with SQL.
 *
 * Who shows it: LogsPage. What it calls: useCrashLog → admin_list_client_errors().
 * Each row: time, the error's name and scrubbed message, the page, the app version and the
 * browser family. No user ID: the crash log never stored one (S1-E1-05).
 */
import { useTranslation } from 'react-i18next';

import { useCrashLog } from '../../hooks/useCrashLog';

import { logTime } from './logTime';
import { LogsFailureNote } from './LogsFailureNote';
import { LogTable } from './LogTable';

/**
 * Renders the view.
 *
 * @returns the crashes, newest first
 */
export function CrashesView() {
  const { t, i18n } = useTranslation('staff');
  const log = useCrashLog();
  if (log.loadFailure !== null) return <LogsFailureNote failure={log.loadFailure} />;
  if (log.isLoading) return <p className="m-0 text-meta">{t('logs.loading')}</p>;

  const headings = ['time', 'error', 'page', 'version', 'browser'].map((column) =>
    t(`logs.crashes.columns.${column}`),
  );
  const rows = log.crashes.map((crash) => ({
    key: crash.id,
    cells: [
      logTime(crash.createdAt, i18n.language),
      crash.errorMessage === '' ? crash.errorName : `${crash.errorName}: ${crash.errorMessage}`,
      crash.routePath,
      crash.appVersion,
      crash.browserFamily,
    ],
  }));
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-body">{t('logs.crashes.intro')}</p>
      <LogTable
        caption={t('logs.views.crashes')}
        headings={headings}
        rows={rows}
        emptyNote={t('logs.crashes.none')}
      />
    </div>
  );
}
