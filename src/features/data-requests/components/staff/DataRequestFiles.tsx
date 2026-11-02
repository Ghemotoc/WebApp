/**
 * DataRequestFiles: the files of the copy sent for a request, while they last: each name, its size
 * and until when the person can download it, with "Open" (bundle ADMIN-2, part c2; story
 * S1-E11-09: "staff see the file names and sizes; opening a file's contents is possible but
 * logged, because staff don't need to read them").
 *
 * Who shows it: DataRequestCopyPanel. What it calls: onOpen(), which useDataRequestCopy sends to
 * admin_open_data_request_file() (the audit row is written first) and then downloads the file.
 */
import { Button } from '@/components/ui/Button';
import { fileSizeText } from '@/features/data-export/lib/fileSize';
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { DataRequestFile } from '../../api/dataRequests';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

/** What the list needs. */
interface DataRequestFilesProps {
  files: DataRequestFile[];
  /** True on the parent's path (part c3): the files wait for the parent, not the person. */
  forParent: boolean;
  onOpen: (file: { exportId: string; displayName: string }) => void;
}

/**
 * Renders the list, or nothing when no copy is waiting.
 *
 * @returns the list and its hint
 */
export function DataRequestFiles({ files, forParent, onOpen }: DataRequestFilesProps) {
  const { t, i18n } = useDataRequestsTranslation();
  if (files.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="m-0 text-base font-semibold text-heading">
        {t(forParent ? 'copy.filesHeadingParent' : 'copy.filesHeading')}
      </h3>
      <p className="m-0 text-sm text-meta">{t('copy.openHint')}</p>
      <ul className="m-0 flex list-none flex-col p-0">
        {files.map((file) => (
          <li
            key={file.exportId}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
          >
            <div className="flex min-w-0 flex-col">
              <span className="font-semibold break-all text-ink">{file.displayName}</span>
              <span className="text-sm text-meta">
                {t('copy.fileLine', {
                  size: fileSizeText(file.fileSize ?? 0, i18n.language),
                  date: formatRomaniaDateTime(new Date(file.expiresAt), i18n.language),
                })}
              </span>
            </div>
            <Button
              size="md"
              variant="secondary"
              aria-label={t('copy.openLabel', { name: file.displayName })}
              onClick={() => onOpen(file)}
            >
              {t('copy.open')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
