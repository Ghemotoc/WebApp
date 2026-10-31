/**
 * LoadedShareDialog: the share dialog with its texts, in a file of its own (story S1-E4-05).
 *
 * Why its own file: the Share button sits in the chapter reader, which must stay inside its
 * 40 KB script budget (e2e/reader-performance.spec.ts), so ShareButton fetches this file only
 * the first time it opens the dialog.
 * Who uses it: ShareButton, through React.lazy. What it calls: registerSharingTranslations, then
 * ShareDialog.
 */
import { useTranslation } from 'react-i18next';

import { registerSharingTranslations } from '../registerSharingTranslations';

import { ShareDialog, type ShareDialogProps } from './ShareDialog';

/**
 * Registers the sharing texts, then draws the dialog.
 *
 * @returns the dialog
 */
export function LoadedShareDialog(props: ShareDialogProps) {
  const { i18n } = useTranslation();
  registerSharingTranslations(i18n);
  return <ShareDialog {...props} />;
}
