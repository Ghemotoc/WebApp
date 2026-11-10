/**
 * DownloadMyDataSection: "Download data" in Settings (story S1-E13-02; board 6.3, the Download
 * my data tab, drawn here as a panel on the one Settings page like the others; GDPR art. 15 and
 * 20).
 *
 * Top to bottom as on the board: the heading and intro, what the copy holds, the note that
 * everything is in the data file and the stories are also Word files, then the request, preparing
 * or ready line (ExportStatus), then Download my stories (DownloadMyStoriesBlock, S1-E13-05) and
 * the note about downloading from 13. The section has id "download-my-data", so the "ready"
 * notification opens it.
 * Who shows it: SettingsPage. What it calls: useLatestDataExport, useDataExportRun and
 * useStartDataExport.
 */
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';

import { useDataExportRun, useLatestDataExport, useStartDataExport } from '../hooks/useDataExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';

import { DownloadMyStoriesBlock } from './DownloadMyStoriesBlock';
import { ExportStatus } from './ExportStatus';

/**
 * What the copy holds, in the board's order (forum posts join once forums exist, S1-E8); the
 * library shelves since IDEAS-1f.
 */
const includedParts = [
  'stories',
  'comments',
  'messages',
  'library',
  'account',
  'settings',
] as const;

/** The list of what the copy holds. */
function IncludedList() {
  const { t } = useDataExportTranslation();
  return (
    <div className="flex flex-col gap-2">
      <Eyebrow>{t('settings.includesLabel')}</Eyebrow>
      <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px] text-body">
        {includedParts.map((part) => (
          <li key={part}>{t(`settings.includes.${part}`)}</li>
        ))}
      </ul>
      <p className="m-0 text-sm text-meta">{t('settings.everythingNote')}</p>
    </div>
  );
}

/** The state line, or a plain message when the copies can't be read. */
function StatusBody() {
  const { t } = useDataExportTranslation();
  const latest = useLatestDataExport();
  const run = useDataExportRun();
  const { start } = useStartDataExport();
  if (latest.isError) return <Notice tone="error">{t('settings.loadFailed')}</Notice>;
  if (latest.data === undefined) return null;
  return <ExportStatus latest={latest.data} run={run} onStart={() => void start()} />;
}

/**
 * Renders the section.
 *
 * @returns the section
 */
export function DownloadMyDataSection() {
  const { t } = useDataExportTranslation();
  return (
    <section
      id="download-my-data"
      aria-labelledby="settings-download-my-data-heading"
      className="flex scroll-mt-24 flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card"
    >
      <div className="flex flex-col gap-1.5">
        <h2
          id="settings-download-my-data-heading"
          className="m-0 font-heading text-[22px] font-bold text-heading"
        >
          {t('settings.heading')}
        </h2>
        <p className="m-0 text-body">{t('settings.intro')}</p>
      </div>
      <IncludedList />
      <StatusBody />
      <DownloadMyStoriesBlock />
      <p className="m-0 rounded-2xl bg-tint px-4.5 py-4 text-[15px] leading-relaxed text-body">
        {t('settings.minorsNote')}
      </p>
    </section>
  );
}
