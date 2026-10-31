/**
 * Hands a CSV text to the browser as a download (stories S1-E11-01 and S1-E11-04).
 *
 * Who calls it: hooks/useAuditLog.ts (the audit log export) and hooks/useComplianceLog.ts (the DSA
 * log export), after the database has returned the rows and logged the export.
 */

/**
 * Starts the download.
 *
 * @param csv - the file's text
 * @param fileName - the name the browser saves it under
 */
export function downloadCsv(csv: string, fileName: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
