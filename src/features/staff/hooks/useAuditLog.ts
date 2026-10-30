/**
 * useAuditLog: the Audit log screen's state: the filters, the current page and the CSV export
 * (story S1-E11-01).
 *
 * Who calls it: AuditLogPage. What it calls: api/auditLog.ts, then lib/auditLogCsv.ts to make the
 * file, which the browser downloads as audit-log-<date>.csv.
 * Typed filters are kept apart from the searched ones: the page changes only when the person
 * presses Search, so typing doesn't fire a query per keystroke. A link may start the page on one
 * kind of action with ?action=<prefix> (Staff › Settings links to "settings.", S1-E11-03).
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  AuditLogError,
  auditLogPageSize,
  emptyFilters,
  exportAuditLog,
  searchAuditLog,
  type AuditLogEntry,
  type AuditLogFailure,
  type AuditLogFilters,
} from '../api/auditLog';
import { auditLogToCsv } from '../lib/auditLogCsv';

/**
 * The reason a read failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't an AuditLogError
 */
function failureOf(hasFailed: boolean, error: unknown): AuditLogFailure | null {
  if (!hasFailed) return null;
  return error instanceof AuditLogError ? error.failure : 'unreachable';
}

/**
 * Hands a CSV text to the browser as a download.
 *
 * @param csv - the file's text
 * @param fileName - the name the browser saves it under
 */
function downloadCsv(csv: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Follows the audit log screen.
 *
 * @returns the typed and searched filters, the page, the entries and the export
 */
export function useAuditLog() {
  const [searchParams] = useSearchParams();
  const startingFilters = { ...emptyFilters, actionPrefix: searchParams.get('action') ?? '' };
  const [typedFilters, setTypedFilters] = useState<AuditLogFilters>(startingFilters);
  const [searchedFilters, setSearchedFilters] = useState<AuditLogFilters>(startingFilters);
  const [pageNumber, setPageNumber] = useState(1);

  // Step 1: one page of rows for the searched filters.
  const page = useQuery<AuditLogEntry[]>({
    queryKey: ['audit-log', searchedFilters, pageNumber],
    retry: false,
    queryFn: async () => searchAuditLog(await requireClient(), searchedFilters, pageNumber),
  });

  // Step 2: the export reads every matching row, then makes and downloads the file.
  const csvExport = useMutation({
    mutationFn: async () => {
      const entries = await exportAuditLog(await requireClient(), searchedFilters);
      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(auditLogToCsv(entries), `audit-log-${today}.csv`);
      return entries.length;
    },
  });

  /** Searches with what was typed, from the first page. */
  function search() {
    setSearchedFilters(typedFilters);
    setPageNumber(1);
  }

  return {
    typedFilters,
    setTypedFilters,
    search,
    entries: page.data ?? [],
    isLoading: page.isPending,
    loadFailure: failureOf(page.isError, page.error),
    pageNumber,
    hasNextPage: (page.data?.length ?? 0) === auditLogPageSize,
    goToPage: setPageNumber,
    exportCsv: () => csvExport.mutate(),
    isExporting: csvExport.isPending,
    exportFailure: failureOf(csvExport.isError, csvExport.error),
    exportedCount: csvExport.data ?? null,
  };
}
