/**
 * ExportStatus: the bottom of Settings › Download my data, in one of four states (story
 * S1-E13-02; board 6.3, the Download my data tab):
 * - nothing yet: "Request my data" and the one-month line;
 * - being made: "We're preparing your file…" with the clock, as a polite status line;
 * - ready: "Your file is ready", until when the link works, the size and "Download ZIP", plus
 *   "Make a new copy";
 * - failed: a plain line and "Try again".
 * Who shows it: DownloadMyDataSection. What it calls: the hooks it is given, and
 * ExportDownloadButton for Download ZIP (a one-minute address for the signed-in owner only,
 * criterion 3). The saved file is named after the day the copy was made, never after the person.
 */
import clockIcon from '@/assets/icons/clock.svg';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { DataExport } from '../api/dataExport';
import type { DataExportRunState } from '../lib/exportRunStore';
import { fileSizeText } from '../lib/fileSize';
import { useDataExportTranslation } from '../registerDataExportTranslations';

import { ExportDownloadButton } from './ExportDownloadButton';

/** What the status needs. */
interface ExportStatusProps {
  latest: DataExport | null;
  run: DataExportRunState;
  onStart: () => void;
}

/** The "being made" line, with the board's clock. */
function PreparingLine() {
  const { t } = useDataExportTranslation();
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl bg-tint px-4.5 py-4 text-[15px] text-body"
    >
      <img
        src={clockIcon}
        alt=""
        aria-hidden="true"
        width={22}
        height={22}
        className="size-5.5 shrink-0"
      />
      {t('settings.preparing')}
    </div>
  );
}

/** "Your file is ready", its size and the download. */
function ReadyLine({ copy, onStart }: { copy: DataExport; onStart: () => void }) {
  const { t, i18n } = useDataExportTranslation();
  const expiresOn = formatRomaniaDate(new Date(copy.expires_at ?? copy.created_at), i18n.language);
  const size = fileSizeText(copy.file_size ?? 0, i18n.language);
  return (
    <div className="flex flex-col gap-3">
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-(--success-bg) px-4.5 py-4 text-[15px] text-(--success-text)"
      >
        <span className="flex flex-col gap-1">
          <span>
            <strong>{t('settings.readyTitle')}</strong>{' '}
            {t('settings.readyBody', { date: expiresOn })}
          </span>
          <span className="text-sm">
            {t('settings.readySize', { count: copy.story_count ?? 0, size })}
          </span>
        </span>
        <ExportDownloadButton
          fileName={copy.file_name}
          label={t('settings.download')}
          downloadName={t('settings.downloadName', {
            date: (copy.ready_at ?? copy.created_at).slice(0, 10),
          })}
        />
      </div>
      <Button variant="text" className="self-start" onClick={onStart}>
        {t('settings.makeNewCopy')}
      </Button>
    </div>
  );
}

/** "Request my data" and the one-month line, or "Try again" after a failure. */
function RequestLine({ hasFailed, onStart }: { hasFailed: boolean; onStart: () => void }) {
  const { t } = useDataExportTranslation();
  return (
    <div className="flex flex-col gap-3">
      {hasFailed && <Notice tone="error">{t('settings.failed')}</Notice>}
      <div className="flex flex-wrap items-center gap-3.5">
        <Button size="lg" onClick={onStart}>
          {hasFailed ? t('settings.tryAgain') : t('settings.request')}
        </Button>
        <span className="text-sm text-meta">{t('settings.requestHint')}</span>
      </div>
    </div>
  );
}

/**
 * Renders the state that applies now.
 *
 * @returns the request button, the preparing line or the ready line
 */
export function ExportStatus({ latest, run, onStart }: ExportStatusProps) {
  if (run.phase === 'running') return <PreparingLine />;
  if (run.phase === 'failed') return <RequestLine hasFailed onStart={onStart} />;
  if (latest !== null) return <ReadyLine copy={latest} onStart={onStart} />;
  return <RequestLine hasFailed={false} onStart={onStart} />;
}
