/**
 * VersionHistory: an entry's live and scheduled versions and its earlier ones with Restore
 * (story S1-E11-06 criterion 7; architecture 1.8.6 step 5).
 *
 * Restore brings an earlier version's copy back as the draft; nothing on the website changes
 * until it is published again. Label and value rows have a fine line between them (Definition of
 * Done, design rules). Who uses it: every website editor.
 */
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { formatRomaniaDate, formatRomaniaDateTime } from '@/lib/romania-time';

import type { ContentVersion } from '../../api/websiteContentStore';
import type { WebsiteEditorState } from '../../hooks/useWebsiteEditor';
import type { EntryVersions } from '../../lib/versionState';

/** What the history needs. */
interface VersionHistoryProps {
  entry: EntryVersions;
  state: WebsiteEditorState;
  /** A few words saying what a version holds (a headline, a question). */
  describe: (version: ContentVersion) => string;
}

/**
 * A date as the editor shows it.
 *
 * @param date - YYYY-MM-DD
 * @param language - the interface language
 * @returns the formatted date
 */
function dayOf(date: string | null, language: string): string {
  return date === null ? '' : formatRomaniaDate(new Date(`${date}T12:00:00Z`), language);
}

/**
 * Renders the history.
 *
 * @returns the section
 */
export function VersionHistory({ entry, state, describe }: VersionHistoryProps) {
  const { t, i18n } = useTranslation('websiteAdmin');
  const language = i18n.language;
  return (
    <section className="flex flex-col gap-2" aria-label={t('history.heading')}>
      <h3 className="m-0 font-heading text-lg font-bold text-heading">{t('history.heading')}</h3>
      <dl className="m-0 flex flex-col text-sm">
        <div className="flex flex-wrap gap-x-3 border-b border-hairline py-2">
          <dt className="font-semibold text-ink">{t('history.live')}</dt>
          <dd className="m-0 text-body">
            {entry.live === null
              ? t('history.nothingLive')
              : t('history.since', { date: dayOf(entry.live.showFrom, language) })}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-3 border-b border-hairline py-2">
          <dt className="font-semibold text-ink">{t('history.scheduled')}</dt>
          <dd className="m-0 text-body">
            {entry.scheduled === null
              ? t('history.none')
              : t('history.goesLive', { date: dayOf(entry.scheduled.showFrom, language) })}
          </dd>
        </div>
      </dl>
      {entry.earlier.length > 0 && (
        <ul className="m-0 flex list-none flex-col p-0">
          {entry.earlier.map((version) => (
            <li
              key={version.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-2 text-sm"
            >
              <span className="min-w-0 text-body">
                {t('history.earlier', {
                  date: dayOf(version.showFrom, language),
                  published:
                    version.publishedAt === null
                      ? ''
                      : formatRomaniaDateTime(new Date(version.publishedAt), language),
                })}
                <span className="block text-meta">{describe(version)}</span>
              </span>
              <Button
                variant="secondary"
                disabled={state.isActing}
                aria-label={t('history.restoreLabel', { date: dayOf(version.showFrom, language) })}
                onClick={() => void state.act({ kind: 'restore', versionId: version.id })}
              >
                {t('history.restore')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
