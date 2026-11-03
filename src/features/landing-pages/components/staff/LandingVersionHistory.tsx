/**
 * LandingVersionHistory: a landing page's published versions, newest first, each with Restore
 * (story S1-E11-14; architecture 1.8.6 step 5; bundle CONTESTS-13a1).
 *
 * Restore brings a version back as the draft; nothing changes at /c/<slug> until it is published
 * again. Rows have a fine line between them (Definition of Done, design rules).
 * Who shows it: LandingPageEditor. What it calls: act({ kind: 'restore' }).
 */
import { Button } from '@/components/ui/Button';
import { formatRomaniaDate, formatRomaniaDateTime } from '@/lib/romania-time';

import type { LandingPageVersion } from '../../api/landingPages';
import type { LandingEditorState } from '../../hooks/useLandingPageEditor';
import { wordsOf } from '../../lib/blocks';
import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

/** What the history needs. */
interface LandingVersionHistoryProps {
  versions: readonly LandingPageVersion[];
  state: LandingEditorState;
}

/**
 * A YYYY-MM-DD date as the editor shows it.
 *
 * @returns the formatted date, or "" when there is none
 */
function dayOf(date: string | null, language: string): string {
  return date === null ? '' : formatRomaniaDate(new Date(`${date}T12:00:00Z`), language);
}

/**
 * Renders the list, or a line saying nothing has been published yet.
 *
 * @returns the section
 */
export function LandingVersionHistory({ versions, state }: LandingVersionHistoryProps) {
  const { t, i18n } = useLandingPageTranslation();
  const language = i18n.language;
  const published = versions.filter((version) => version.status === 'published');
  return (
    <section aria-labelledby="landing-history-heading" className="flex flex-col gap-2">
      <h3 id="landing-history-heading" className="m-0 font-heading text-lg font-bold text-heading">
        {t('editor.history.heading')}
      </h3>
      {published.length === 0 && (
        <p className="m-0 text-sm text-meta">{t('editor.history.none')}</p>
      )}
      <ul className="m-0 flex list-none flex-col p-0">
        {published.map((version) => {
          const hero = version.content.blocks.find((block) => block.kind === 'hero');
          const showFrom = dayOf(version.showFrom, language);
          return (
            <li
              key={version.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-2 text-sm"
            >
              <span className="min-w-0 text-body">
                {t('editor.history.version', {
                  date: showFrom,
                  published:
                    version.publishedAt === null
                      ? ''
                      : formatRomaniaDateTime(new Date(version.publishedAt), language),
                })}
                {version.takeDownOn !== null && (
                  <span className="block text-meta">
                    {t('editor.history.takenDown', { date: dayOf(version.takeDownOn, language) })}
                  </span>
                )}
                <span className="block text-meta" lang="ro">
                  {hero === undefined ? '' : wordsOf(hero, 'ro', 'title')}
                </span>
              </span>
              <Button
                variant="secondary"
                disabled={state.isActing}
                aria-label={t('editor.history.restoreLabel', { date: showFrom })}
                onClick={() => void state.act({ kind: 'restore', versionId: version.id })}
              >
                {t('editor.history.restore')}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
