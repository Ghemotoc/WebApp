/**
 * ParentCopyPanel: the one-time link to an under-16's data request copy, for their parent or
 * guardian (bundle ADMIN-2, part c3; story S1-E11-09: "for a parent, a one-time link to the
 * checked email address", which "expires after seven days").
 *
 * Who shows it: DataRequestParentPage, for a copy link. What it calls: onOpen(), which
 * useParentLink sends to open_data_request_parent_copy(); the first opening starts the link's one
 * hour (proposal). Each file then downloads with Download my data's ExportDownloadButton, signed
 * out, through policy exports_select_parent_link. Plain page: no doodles.
 */
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { ExportDownloadButton } from '@/features/data-export/components/ExportDownloadButton';
import { fileSizeText } from '@/features/data-export/lib/fileSize';
import { formatRomaniaDateTime } from '@/lib/romania-time';

import type { OpenedParentCopy, ParentCopyLink } from '../../api/dataRequestParent';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

/** What the panel needs. */
interface ParentCopyPanelProps {
  link: ParentCopyLink;
  isOpening: boolean;
  opened: OpenedParentCopy | null;
  openFailed: boolean;
  onOpen: () => void;
}

/**
 * The files, each with its size and a Download button, and until when they can be downloaded.
 *
 * @returns the list
 */
function ParentCopyFiles({ opened }: { opened: Extract<OpenedParentCopy, { outcome: 'ok' }> }) {
  const { t, i18n } = useDataRequestsTranslation();
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 font-semibold text-ink">
        {t('parent.openUntil', {
          time: formatRomaniaDateTime(new Date(opened.openUntil), i18n.language),
        })}
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {opened.files.map((file) => (
          <li key={file.fileName} className="flex flex-wrap items-center gap-3">
            <span className="min-w-0 break-all text-body">
              {t('parent.fileLine', {
                name: file.displayName,
                size: fileSizeText(file.fileSize ?? 0, i18n.language),
              })}
            </span>
            <ExportDownloadButton
              fileName={file.fileName}
              label={t('parent.download')}
              accessibleName={t('parent.downloadLabel', { name: file.displayName })}
              downloadName={file.displayName}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Where the link stands once it can't open any more: used, or its files are gone.
 *
 * @returns the key of the words, or null while it can still open
 */
function closedKey(link: ParentCopyLink, opened: OpenedParentCopy | null): string | null {
  const outcome = opened?.outcome ?? link.state;
  if (outcome === 'used') return 'parent.used';
  if (outcome === 'expired') return 'parent.expired';
  if (outcome === 'gone') return 'parent.goneBody';
  return null;
}

/**
 * Renders the copy: what it holds, then Open the files, then the files.
 *
 * @returns the panel
 */
export function ParentCopyPanel({
  link,
  isOpening,
  opened,
  openFailed,
  onOpen,
}: ParentCopyPanelProps) {
  const { t } = useDataRequestsTranslation();
  const closed = closedKey(link, opened);
  return (
    <>
      <p className="m-0 text-body">
        {t('parent.copyIntro', { reference: link.reference, handle: link.handle })}
      </p>
      {closed !== null && <Notice tone="info">{t(closed)}</Notice>}
      {closed === null && opened?.outcome !== 'ok' && (
        <>
          <p className="m-0 text-body">{t('parent.copyOnce')}</p>
          <Button className="self-start" disabled={isOpening} onClick={onOpen}>
            {t('parent.openButton')}
          </Button>
        </>
      )}
      {opened?.outcome === 'ok' && <ParentCopyFiles opened={opened} />}
      {openFailed && <Notice tone="error">{t('parent.openFailed')}</Notice>}
    </>
  );
}
