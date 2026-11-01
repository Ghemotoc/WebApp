/**
 * StoriesExportReady: "Your files are ready" in Settings › Download my stories (story S1-E13-05,
 * criterion 2): what the copy holds, until when the link works and "Download". When the writer
 * asked again within 24 hours and nothing had changed, it also says these are the files made
 * earlier (criterion 4, proposal).
 * Who shows it: DownloadMyStoriesBlock. What it calls: ExportDownloadButton.
 */
import type { TFunction } from 'i18next';

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
  /** True right after "Get my files" offered these files instead of new ones. */
  wasReused: boolean;
}

/** The kind of file the copy was saved as, from its name. */
function fileKindOf(copy: DataExport): 'zip' | 'docx' | 'json' {
  if (copy.file_name.endsWith('.json')) return 'json';
  if (copy.file_name.endsWith('.docx')) return 'docx';
  return 'zip';
}

/** The name the browser saves the file under: the story's slug, or "my-stories-<day>.zip". */
function downloadNameOf(
  copy: DataExport,
  story: StoriesExportReadyProps['story'],
  allName: string,
) {
  const kind = fileKindOf(copy);
  if (story === null) return allName;
  if (kind === 'docx' && !copy.include_chapters) return `${story.slug}-plan.docx`;
  return `${story.slug}.${kind}`;
}

/** The files a copy holds, in the order they were ticked: "the chapters as a Word file". */
function holdsParts(copy: DataExport, t: TFunction): string[] {
  const parts: string[] = [];
  const chosenCount = copy.chapter_ids?.length ?? null;
  if (copy.include_chapters) {
    parts.push(
      chosenCount === null
        ? t('stories.holds.chapters')
        : t('stories.holds.chosenChapters', { count: chosenCount }),
    );
  }
  if (copy.include_plan) parts.push(t('stories.holds.plan'));
  if (copy.include_data) parts.push(t('stories.holds.data'));
  return parts;
}

/** "“Rain”: the chapters as a Word file and the plan as a Word file, in one ZIP". */
function useHoldsLine() {
  const { t, i18n } = useDataExportTranslation();
  // British English lists, so there is no comma before "and".
  const listFormat = new Intl.ListFormat(i18n.language === 'en' ? 'en-GB' : i18n.language, {
    type: 'conjunction',
  });
  return (copy: DataExport, story: StoriesExportReadyProps['story']) => {
    const what =
      story === null
        ? t('stories.holds.allStories', { count: copy.story_count ?? 0 })
        : t('stories.holds.oneStory', { title: story.title });
    const line = `${what}: ${listFormat.format(holdsParts(copy, t))}`;
    return fileKindOf(copy) === 'zip' ? `${line}, ${t('stories.holds.inZip')}` : line;
  };
}

/**
 * Renders the line.
 *
 * @returns the ready line
 */
export function StoriesExportReady({ copy, story, wasReused }: StoriesExportReadyProps) {
  const { t, i18n } = useDataExportTranslation();
  const holdsLine = useHoldsLine();
  const expiresOn = formatRomaniaDate(new Date(copy.expires_at ?? copy.created_at), i18n.language);
  const size = fileSizeText(copy.file_size ?? 0, i18n.language);
  const day = (copy.ready_at ?? copy.created_at).slice(0, 10);
  const kind = fileKindOf(copy);
  const downloadName = downloadNameOf(copy, story, t('stories.downloadNameAll', { date: day }));
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-(--success-bg) px-4.5 py-4 text-[15px] text-(--success-text)"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span>
          <strong>{t('stories.readyTitle')}</strong> {t('settings.readyBody', { date: expiresOn })}
        </span>
        <span className="text-sm break-words">
          {holdsLine(copy, story)} · {size}
        </span>
        {wasReused && <span className="text-sm">{t('stories.reused')}</span>}
      </span>
      <ExportDownloadButton
        copy={copy}
        label={t(`stories.download.${kind}`)}
        downloadName={downloadName}
      />
    </div>
  );
}
