/**
 * CallsView: every call the app made in the last 30 days, newest first, with filters and pages
 * (bundle LOGS-1, part d; Robert, 6 Nov 2026: "every call that's been made, where it failed").
 *
 * Who shows it: LogsPage. What it calls: useCallLog → admin_list_calls().
 * Each row: time, who (username and the first 8 characters of the user ID, or "Visitor"), the
 * call (kind, method and name), the outcome with status and error code, the duration, the page
 * and the app version. Never what was sent or what came back: the log doesn't keep it.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import type { CallLogRow } from '../../api/appLogs';
import { useCallLog } from '../../hooks/useCallLog';

import { CallsFilters } from './CallsFilters';
import { logTime } from './logTime';
import { LogsFailureNote } from './LogsFailureNote';
import { LogTable } from './LogTable';

/**
 * Who made a call, as "@username (1a2b3c4d)", "(1a2b3c4d)" or the word for a visitor.
 *
 * @param call - the call
 * @param visitorLabel - "Visitor" in the page's language
 * @returns the text for the Who cell
 */
function whoMadeIt(call: CallLogRow, visitorLabel: string): string {
  if (call.userIdShort === null) return visitorLabel;
  return call.handle === null ? `(${call.userIdShort})` : `@${call.handle} (${call.userIdShort})`;
}

/**
 * The outcome as "403 · 42501", or "No answer" for a call that got none.
 *
 * @param call - the call
 * @param noAnswerLabel - "No answer" in the page's language
 * @returns the text for the Result cell
 */
function resultOf(call: CallLogRow, noAnswerLabel: string): string {
  const status = call.status === 0 ? noAnswerLabel : String(call.status);
  return call.errorCode === null ? status : `${status} · ${call.errorCode}`;
}

/**
 * Renders the view.
 *
 * @returns the form, the calls and the page buttons
 */
export function CallsView() {
  const { t, i18n } = useTranslation('staff');
  const log = useCallLog();
  const headings = ['time', 'who', 'call', 'result', 'duration', 'page', 'version'].map((column) =>
    t(`logs.calls.columns.${column}`),
  );
  const rows = log.calls.map((call) => ({
    key: call.id,
    cells: [
      logTime(call.calledAt, i18n.language),
      whoMadeIt(call, t('logs.calls.visitor')),
      `${t(`logs.kinds.${call.kind}`)} · ${call.method} ${call.name}`,
      <span
        key="result"
        className={call.outcome === 'ok' ? undefined : 'font-semibold text-(--error-text)'}
      >
        {resultOf(call, t('logs.calls.noAnswer'))}
      </span>,
      t('logs.calls.milliseconds', { milliseconds: call.durationMs }),
      call.routePath,
      call.appVersion,
    ],
  }));

  return (
    <div className="flex flex-col gap-5">
      <CallsFilters
        filters={log.typedFilters}
        onChange={log.setTypedFilters}
        onSearch={log.search}
      />
      {log.loadFailure !== null && <LogsFailureNote failure={log.loadFailure} />}
      {log.loadFailure === null && log.isLoading && (
        <p className="m-0 text-meta">{t('logs.loading')}</p>
      )}
      {log.loadFailure === null && !log.isLoading && (
        <>
          <LogTable
            caption={t('logs.views.calls')}
            headings={headings}
            rows={rows}
            emptyNote={t('logs.calls.none')}
          />
          <nav aria-label={t('logs.calls.pages')} className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" disabled={log.pageNumber === 1} onClick={log.goNewer}>
              {t('logs.calls.newer')}
            </Button>
            <span className="text-sm text-meta">
              {t('logs.calls.page', { number: log.pageNumber })}
            </span>
            <Button variant="secondary" disabled={!log.hasOlderPage} onClick={log.goOlder}>
              {t('logs.calls.older')}
            </Button>
          </nav>
        </>
      )}
    </div>
  );
}
