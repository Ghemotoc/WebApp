/**
 * useComplianceLog: the compliance log on the Metrics page: reading it, logging an entry, finishing
 * an open one, setting the launch date and the CSV export (story S1-E11-04).
 *
 * Who calls it: components/metrics/ComplianceLogSection.tsx. What it calls: api/complianceLog.ts,
 * then lib/complianceLogCsv.ts for the file. After every change the log is read again, so the page
 * always shows what the database holds.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  completeComplianceEntry,
  ComplianceLogError,
  fetchComplianceLog,
  logComplianceEntry,
  setLaunchDate,
  type ComplianceLog,
  type ComplianceLogFailure,
  type NewComplianceEntry,
} from '../api/complianceLog';
import { complianceLogToCsv } from '../lib/complianceLogCsv';
import { downloadCsv } from '../lib/downloadCsv';

/** The cache key of the log. */
const complianceLogKey = ['compliance-log'];

/**
 * The reason a call failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a ComplianceLogError
 */
function failureOf(hasFailed: boolean, error: unknown): ComplianceLogFailure | null {
  if (!hasFailed) return null;
  return error instanceof ComplianceLogError ? error.failure : 'unreachable';
}

/**
 * Reads the whole log again for the download (logged as a sensitive read), then saves the file.
 *
 * @returns how many rows the file holds
 */
async function exportLog(): Promise<number> {
  const log = await fetchComplianceLog(await requireClient(), true);
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(complianceLogToCsv(log.entries), `dsa-log-${today}.csv`);
  return log.entries.length;
}

/**
 * Follows the compliance log.
 *
 * @returns the log, the four actions and their states
 */
export function useComplianceLog() {
  const queryClient = useQueryClient();
  const log = useQuery<ComplianceLog>({
    queryKey: complianceLogKey,
    retry: false,
    queryFn: async () => fetchComplianceLog(await requireClient()),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: complianceLogKey });
  const add = useMutation({
    mutationFn: async (entry: NewComplianceEntry) =>
      logComplianceEntry(await requireClient(), entry),
    onSuccess: refresh,
  });
  const complete = useMutation({
    mutationFn: async (change: { reference: string; action: string }) =>
      completeComplianceEntry(await requireClient(), change.reference, change.action),
    onSuccess: refresh,
  });
  const launch = useMutation({
    mutationFn: async (launchDate: string) => setLaunchDate(await requireClient(), launchDate),
    onSuccess: refresh,
  });
  const csvExport = useMutation({ mutationFn: exportLog });

  return {
    log: log.data ?? null,
    loadFailure: failureOf(log.isError, log.error),
    add: (entry: NewComplianceEntry) => add.mutateAsync(entry),
    isAdding: add.isPending,
    addFailure: failureOf(add.isError, add.error),
    addedReference: add.data ?? null,
    complete: (reference: string, action: string) => complete.mutateAsync({ reference, action }),
    isCompleting: complete.isPending,
    completeFailure: failureOf(complete.isError, complete.error),
    saveLaunchDate: (launchDate: string) => launch.mutateAsync(launchDate),
    isSavingLaunchDate: launch.isPending,
    launchFailure: failureOf(launch.isError, launch.error),
    exportCsv: () => csvExport.mutate(),
    isExporting: csvExport.isPending,
    exportFailure: failureOf(csvExport.isError, csvExport.error),
  };
}
