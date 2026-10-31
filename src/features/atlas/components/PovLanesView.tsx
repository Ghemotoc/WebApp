/**
 * PovLanesView: the chapters against their point-of-view characters (story S1-E17-21: "chapters
 * run down the rows in book order, with one column per POV character … marked by status with
 * colour and a text label").
 *
 * A real table, so a screen reader reads each mark with its chapter and its character. The
 * table scrolls inside its own box when there are many characters, never the page (rule 21).
 * Who uses it: StorylinePage. What it calls: lib/povLanes.ts and PlanningStatusPill.
 */
import { Link } from 'react-router';

import type { Storyline } from '../api/storyline';
import { povCharacters } from '../lib/povLanes';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanningStatusPill } from './PlanningStatusPill';

/** What the lanes need. */
export interface PovLanesViewProps {
  slug: string;
  storyline: Storyline;
  labelOf: (code: string) => string;
}

/**
 * Renders the lanes.
 *
 * @returns the table, or a plain line when there is nothing to show
 */
export function PovLanesView({ slug, storyline, labelOf }: PovLanesViewProps) {
  const { t } = useAtlasTranslation();
  const tellers = povCharacters(storyline.characters, storyline.chapters);
  if (storyline.chapters.length === 0)
    return <p className="m-0 text-body">{t('storyline.lanes.noChapters')}</p>;
  if (tellers.length === 0) return <p className="m-0 text-body">{t('storyline.lanes.none')}</p>;
  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby="atlas-lanes-caption"
      className="max-w-full overflow-x-auto rounded-card border border-border bg-surface"
    >
      <table className="w-full border-collapse text-left text-sm">
        <caption id="atlas-lanes-caption" className="sr-only">
          {t('storyline.lanes.caption')}
        </caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className="px-4 py-3 font-semibold text-heading">
              {t('storyline.lanes.chapterColumn')}
            </th>
            {tellers.map((character) => (
              <th
                key={character.id}
                scope="col"
                className="px-4 py-3 font-semibold break-words text-heading"
              >
                {character.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {storyline.chapters.map((chapter) => (
            <tr
              key={chapter.code}
              data-testid="atlas-lane-row"
              className="border-b border-hairline last:border-b-0"
            >
              <th scope="row" className="px-4 py-3 font-normal">
                <Link to={`/write/s/${slug}/c/${chapter.code}`} className="text-link">
                  {labelOf(chapter.code)}
                  {chapter.title === '' ? '' : `: ${chapter.title}`}
                </Link>
              </th>
              {tellers.map((character) => (
                <td key={character.id} className="px-4 py-3">
                  {chapter.povCharacterId === character.id && (
                    <PlanningStatusPill status={chapter.planningStatus} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
