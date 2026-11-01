/**
 * ExportDownloadButton: downloads a ready copy (stories S1-E13-02 and S1-E13-05). It asks Storage
 * for a one-minute address that only the signed-in owner gets (criterion 3 of both stories), then
 * lets the browser download the file under a name that never holds the person's name or ID.
 * Who shows it: ExportStatus (Download ZIP) and StoriesExportReady (Download Word files).
 * What it calls: exportDownloadAddress().
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { requireClient } from '@/features/account/hooks/useMyNames';

import { exportDownloadAddress, type DataExport } from '../api/dataExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';

/** What the button needs. */
interface ExportDownloadButtonProps {
  copy: DataExport;
  /** The button's words, for example "Download ZIP". */
  label: string;
  /** The saved file's name, for example "my-data-2026-11-01.zip". */
  downloadName: string;
}

/**
 * Renders the button, and a plain line when the file can't be opened.
 *
 * @returns the button
 */
export function ExportDownloadButton({ copy, label, downloadName }: ExportDownloadButtonProps) {
  const { t } = useDataExportTranslation();
  const [hasFailed, setHasFailed] = useState(false);

  /** Asks Storage for the address and lets the browser download it. */
  async function download() {
    setHasFailed(false);
    try {
      const address = await exportDownloadAddress(
        await requireClient(),
        copy.file_name,
        downloadName,
      );
      window.location.assign(address);
    } catch (error) {
      console.warn(`The copy couldn't be opened: ${String(error)}`);
      setHasFailed(true);
    }
  }

  return (
    <>
      <Button size="md" onClick={() => void download()}>
        {label}
      </Button>
      {hasFailed && <Notice tone="error">{t('settings.downloadFailed')}</Notice>}
    </>
  );
}
