/**
 * errorReporter: the one place the app reports an unexpected error to our error log
 * (story S1-E1-05).
 *
 * Who calls it: lib/installGlobalErrorHandlers.ts (errors nothing else caught) and
 * components/ErrorPage.tsx (a page that failed to draw).
 * What it calls next: lib/buildErrorReport.ts to scrub the error, then api/clientErrors.ts.
 * Limits in this browser: at most 5 reports per page load and never the same error twice, so one
 * broken page can't flood the log; asking again about the same error gets the first answer (the
 * same error code). The database adds a shared per-minute limit.
 * It never throws: reporting an error must not cause a second one. A failed report is written to
 * the browser console without its content (CLAUDE.md rule 12), so a developer can still see it.
 */
import { getSupabaseClient } from '@/lib/supabase';

import { reportClientError } from '../api/clientErrors';
import { buildErrorReport, type ErrorReport } from './buildErrorReport';

/** The most reports one page load sends. */
export const maximumReportsPerPageLoad = 5;

/** The reports sent in this page load, by the error's name and message, with their answers. */
const sentReports = new Map<string, Promise<string | null>>();

/**
 * Reports an error, unless this page load has already sent enough.
 *
 * @param thrown - anything that was thrown
 * @param routePath - the page's route pattern, when the caller knows it better than the tracker
 * @returns the error code to show ("E-" and the first six characters of the row's ID), or null
 *   when nothing was stored (over a limit, no database, or the report failed). A repeat of the
 *   same error gets the first report's answer.
 */
export function reportError(thrown: unknown, routePath?: string): Promise<string | null> {
  // Step 1: scrub the error. The same error again gets the answer of its first report.
  const report = buildErrorReport(thrown, routePath);
  const errorKey = `${report.errorName}: ${report.errorMessage}`;
  const earlierReport = sentReports.get(errorKey);
  if (earlierReport !== undefined) return earlierReport;

  // Step 2: past the page load's limit, send nothing more.
  if (sentReports.size >= maximumReportsPerPageLoad) return Promise.resolve(null);

  // Step 3: send it and remember the answer.
  const sending = sendReport(report);
  sentReports.set(errorKey, sending);
  return sending;
}

/**
 * Sends one scrubbed report.
 *
 * @param report - from lib/buildErrorReport.ts
 * @returns the error code, or null when nothing was stored
 */
async function sendReport(report: ErrorReport): Promise<string | null> {
  // Without Supabase settings (a preview without them) there is no log.
  try {
    const client = await getSupabaseClient();
    if (client === null) return null;
    const rowId = await reportClientError(client, report);
    return rowId === null ? null : errorCodeFromId(rowId);
  } catch {
    console.warn('Could not send an error report to the error log.');
    return null;
  }
}

/**
 * Makes the short code a person can quote to support.
 *
 * @param rowId - the client_errors row's ID
 * @returns for example "E-4F7A2C"
 */
export function errorCodeFromId(rowId: string): string {
  return `E-${rowId.replaceAll('-', '').slice(0, 6).toUpperCase()}`;
}

/** Forgets what this page load reported. For tests only. */
export function resetReportedErrorsForTests(): void {
  sentReports.clear();
}
