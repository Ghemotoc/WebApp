/**
 * Sends one error report to our own error log (story S1-E1-05; decided 18 Oct 2026, 10:46: our own
 * simple log in our own database, no outside service).
 *
 * Who calls it: lib/errorReporter.ts.
 * What it calls next: report_client_error() in the database, which anyone may call, signed out
 * included. It scrubs and trims again, applies a shared per-minute limit and stores the row in
 * public.client_errors (supabase/migrations/20261018100001_s1_e1_05_client_errors.sql).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ErrorReport } from '../lib/buildErrorReport';

/**
 * Stores one report.
 *
 * @param client - the shared Supabase client
 * @param report - the scrubbed fields from lib/buildErrorReport.ts
 * @returns the new row's ID, or null when the shared limit dropped the report
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function reportClientError(
  client: AppSupabaseClient,
  report: ErrorReport,
): Promise<string | null> {
  const { data, error } = await client.rpc('report_client_error', {
    error_name: report.errorName,
    error_message: report.errorMessage,
    route_path: report.routePath,
    app_version: report.appVersion,
    browser_family: report.browserFamily,
  });
  if (error !== null) throw new Error(`Could not send the error report: ${error.message}`);
  return data;
}
