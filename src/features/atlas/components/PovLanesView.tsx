/**
 * PovLanesView: the chapters against their point-of-view characters (story S1-E17-21: "chapters
 * run down the rows in book order, with one column per POV character … marked by status with
 * colour and a text label").
 *
 * Above the table, a tile per teller with how many chapters they tell (bundle G10 ATLAS, part c1;
 * board AtlasPov). A real table, so a screen reader reads each mark with its chapter and its character. The
 * table scrolls inside its own box when there are many characters, never the page (rule 21).
 * Who uses it: StorylinePage. What it calls: lib/povLanes.ts and PlanningStatusPill.
 */
import { Link } from 'react-router';

import type { Storyline, StorylineChapter } from '../api/storyline';
import { povCharacters } from '../lib/povLanes';
import { useAtlasTranslation } from '../registerAtlasTranslations';

import { PlanningStatusPill } from './PlanningStatusPill';

/** What the lanes need. */
export interface PovLanesViewProps {
  slug: string;
  storyline: Storyline;
  labelOf: (code: string) => string;
}

/** A character who tells at least one chapter. */
interface Teller {
  id: string;
  name: string;
}

/** How many chapters each character tells, as a row of small glass tiles. */
function TellerCounts({ tellers, chapters }: { tellers: Teller[]; chapters: StorylineChapter[] }) {
  const { t } = useAtlasTranslation();
  return (
    <ul
      aria-label={t('storyline.lanes.countsLabel')}
      className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-5"
    >
      {tellers.map((teller) => (
        <li
          key={teller.id}
          className="flex min-w-0 flex-col gap-1 rounded-3xl border border-border bg-surface px-[18px] py-3.5 shadow-card"
        >
          <span className="text-[13px] break-words text-meta">
            {t('storyline.lanes.chaptersBy', { name: teller.name })}
          </span>
          <b className="font-heading text-2xl font-extrabold text-heading">
            {chapters.filter((chapter) => chapter.povCharacterId === teller.id).length}
          </b>
        </li>
      ))}
    </ul>
  );
}

/** One chapter's row: its name as a link, and its status under whoever tells it. */
function LaneRow({
  slug,
  chapter,
  label,
  tellers,
}: {
  slug: string;
  chapter: StorylineChapter;
  label: string;
  tellers: Teller[];
}) {
  return (
    <tr data-testid="atlas-lane-row" className="border-b border-hairline last:border-b-0">
      <th scope="row" className="px-3.5 py-2 font-semibold">
        <Link
          to={`/write/s/${slug}/c/${chapter.code}`}
          className="text-heading no-underline hover:underline"
        >
          {label}
          {chapter.title === '' ? '' : `: ${chapter.title}`}
        </Link>
      </th>
      {tellers.map((character) => (
        <td key={character.id} className="px-1.5 py-2 text-center align-middle">
          {chapter.povCharacterId === character.id && (
            <PlanningStatusPill status={chapter.planningStatus} />
          )}
        </td>
      ))}
    </tr>
  );
}

/** The table: a row per chapter in book order, a column per teller, the status where they meet. */
function LanesTable({
  slug,
  storyline,
  labelOf,
  tellers,
}: PovLanesViewProps & { tellers: Teller[] }) {
  const { t } = useAtlasTranslation();
  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby="atlas-lanes-caption"
      className="max-w-full overflow-x-auto rounded-card border border-border bg-surface p-2 shadow-card"
    >
      <table className="mx-auto border-collapse text-left text-sm">
        <caption id="atlas-lanes-caption" className="sr-only">
          {t('storyline.lanes.caption')}
        </caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className="px-3.5 py-2.5 font-semibold text-heading">
              {t('storyline.lanes.chapterColumn')}
            </th>
            {tellers.map((character) => (
              <th
                key={character.id}
                scope="col"
                className="min-w-[104px] px-1.5 py-2.5 text-center font-semibold break-words text-heading"
              >
                {character.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {storyline.chapters.map((chapter) => (
            <LaneRow
              key={chapter.code}
              slug={slug}
              chapter={chapter}
              label={labelOf(chapter.code)}
              tellers={tellers}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renders the lanes.
 *
 * @returns the tiles and the table, or a plain line when there is nothing to show
 */
export function PovLanesView({ slug, storyline, labelOf }: PovLanesViewProps) {
  const { t } = useAtlasTranslation();
  const tellers = povCharacters(storyline.characters, storyline.chapters);
  if (storyline.chapters.length === 0)
    return <p className="m-0 text-body">{t('storyline.lanes.noChapters')}</p>;
  if (tellers.length === 0) return <p className="m-0 text-body">{t('storyline.lanes.none')}</p>;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <TellerCounts tellers={tellers} chapters={storyline.chapters} />
      <LanesTable slug={slug} storyline={storyline} labelOf={labelOf} tellers={tellers} />
    </div>
  );
}
