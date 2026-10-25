/**
 * LoadedReportDialog: the report dialog with its texts, in a file of its own (story S1-E10-01;
 * split out in S1-E6-03).
 *
 * Why its own file: ReportButton sits on every screen with user content, the chapter reader
 * included, which must stay inside its script budget (40 KB on top of the home page,
 * e2e/reader-performance.spec.ts, S1-E4-01b). The dialog and the "reporting" texts are about
 * 16 KB, so ReportButton fetches this file only the first time someone presses Report.
 * Who uses it: ReportButton, through React.lazy. What it calls: registerReportingTranslations,
 * then ReportDialog.
 */
import { useTranslation } from 'react-i18next';

import { registerReportingTranslations } from '../registerReportingTranslations';

import { ReportDialog, type ReportDialogProps } from './ReportDialog';

/**
 * Registers the reporting texts, then draws the dialog.
 *
 * @returns the dialog
 */
export function LoadedReportDialog(props: ReportDialogProps) {
  const { i18n } = useTranslation();
  registerReportingTranslations(i18n);
  return <ReportDialog {...props} />;
}
