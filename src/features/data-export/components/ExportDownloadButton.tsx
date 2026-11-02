/**
 * ExportDownloadButton: downloads a ready copy (stories S1-E13-02 and S1-E13-05). It asks Storage
 * for a one-minute address that only the signed-in owner gets (criterion 3 of both stories), then
 * lets the browser download the file under a name that never holds the person's name or ID.
 * Who shows it: ExportStatus (Download ZIP), StoriesExportReady (Download Word files) and, for a
 * copy staff sent for a data request, MyDataRequestRow and, signed out, the parent's page
 * ParentCopyFiles (S1-E11-09; there policy exports_select_parent_link allows it, not the owner's).
 * What it calls: exportDownloadAddress().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { requireClient } from '@/features/account/hooks/useMyNames';

import { exportDownloadAddress } from '../api/dataExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';

/** What the button needs. */
interface ExportDownloadButtonProps {
  /** The file's random name in the exports bucket. */
  fileName: string;
  /** The button's words, for example "Download ZIP". */
  label: string;
  /** The saved file's name, for example "my-data-2026-11-01.zip". */
  downloadName: string;
  /** A fuller name for screen readers when several buttons share the same words. */
  accessibleName?: string;
}

/**
 * Renders the button, and a plain line when the file can't be opened.
 *
 * @returns the button
 */
export function ExportDownloadButton({
  fileName,
  label,
  downloadName,
  accessibleName,
}: ExportDownloadButtonProps) {
  const { t } = useDataExportTranslation();
  const [hasFailed, setHasFailed] = useState(false);

  /** Asks Storage for the address and lets the browser download it. */
  async function download() {
    setHasFailed(false);
    try {
      const address = await exportDownloadAddress(await requireClient(), fileName, downloadName);
      window.location.assign(address);
    } catch (error) {
      console.warn(`The copy couldn't be opened: ${String(error)}`);
      setHasFailed(true);
    }
  }

  return (
    <>
      <Button size="md" aria-label={accessibleName} onClick={() => void download()}>
        {label}
      </Button>
      {hasFailed && <Notice tone="error">{t('settings.downloadFailed')}</Notice>}
    </>
  );
}
