/**
 * StoriesExportReady: "Your Word files are ready" in Settings › Download my stories (story
 * S1-E13-05, criterion 2): which stories they hold, until when the link works and "Download".
 * When the writer asked again within 24 hours and nothing had changed, it also says these are
 * the files made earlier (criterion 4, proposal).
 * Who shows it: DownloadMyStoriesBlock. What it calls: ExportDownloadButton.
 */
import { formatRomaniaDate } from '@/lib/romania-time';

import type { DataExport } from '../api/dataExport';
import { fileSizeText } from '../lib/fileSize';
import { useDataExportTranslation } from '../registerDataExportTranslations';

import { ExportDownloadButton } from './ExportDownloadButton';

/** What the ready line needs. */
interface StoriesExportReadyProps {
  copy: DataExport;
  /** The one story's title and slug, or null when the copy holds all the writer's stories. */
  story: { title: string; slug: string } | null;
  /** True right after "Get Word files" offered these files instead of new ones. */
  wasReused: boolean;
}

/**
 * Renders the line.
 *
 * @returns the ready line
 */
export function StoriesExportReady({ copy, story, wasReused }: StoriesExportReadyProps) {
  const { t, i18n } = useDataExportTranslation();
  const expiresOn = formatRomaniaDate(new Date(copy.expires_at ?? copy.created_at), i18n.language);
  const size = fileSizeText(copy.file_size ?? 0, i18n.language);
  const day = (copy.ready_at ?? copy.created_at).slice(0, 10);
  // One story is saved as "<its slug>.docx"; all of them as "my-stories-<day>.zip".
  const downloadName =
    story === null ? t('stories.downloadNameAll', { date: day }) : `${story.slug}.docx`;
  const holds =
    story === null
      ? t('stories.holdsAll', { count: copy.story_count ?? 0 })
      : t('stories.holdsOne', { title: story.title });
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-(--success-bg) px-4.5 py-4 text-[15px] text-(--success-text)"
    >
      <span className="flex flex-col gap-1">
        <span>
          <strong>{t('stories.readyTitle')}</strong> {t('settings.readyBody', { date: expiresOn })}
        </span>
        <span className="text-sm">
          {holds} · {size}
        </span>
        {wasReused && <span className="text-sm">{t('stories.reused')}</span>}
      </span>
      <ExportDownloadButton
        copy={copy}
        label={story === null ? t('stories.downloadAll') : t('stories.downloadOne')}
        downloadName={downloadName}
      />
    </div>
  );
}
