/**
 * MyDataRequestFiles: the files of a copy the team sent for one of the person's data requests,
 * each with its size and a Download button, and until when they work (bundle ADMIN-2, part c2;
 * story S1-E11-09: "the user gets a link that needs sign-in and expires after seven days").
 *
 * Who shows it: MyDataRequestRow. What it calls: ExportDownloadButton from Download my data, which
 * asks Storage for a one-minute address only the signed-in owner gets.
 */
import { ExportDownloadButton } from '@/features/data-export/components/ExportDownloadButton';
import { fileSizeText } from '@/features/data-export/lib/fileSize';
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { MyDataRequestFile } from '../api/myDataRequests';
import { useDataRequestsTranslation } from '../registerDataRequestsTranslations';

/**
 * Renders the files, or nothing before a copy is sent.
 *
 * @returns the list
 */
export function MyDataRequestFiles({ files }: { files: MyDataRequestFile[] }) {
  const { t, i18n } = useDataRequestsTranslation();
  const first = files[0];
  if (first === undefined) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 font-semibold text-ink">
        {t('mine.copyReady', {
          date: formatRomaniaDateTime(new Date(first.expiresAt), i18n.language),
        })}
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {files.map((file) => (
          <li key={file.fileName} className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 break-all text-body">
              {t('mine.fileLine', {
                name: file.displayName,
                size: fileSizeText(file.fileSize ?? 0, i18n.language),
              })}
            </span>
            <ExportDownloadButton
              fileName={file.fileName}
              label={t('mine.download')}
              accessibleName={t('mine.downloadLabel', { name: file.displayName })}
              downloadName={file.displayName}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
