/**
 * PovLanesView: the chapters against their point-of-view characters (story S1-E17-21; redrawn by
 * user stories bundle 6, story 6.11, board E30: "One row per chapter in book order and one column
 * per point-of-view character; the mark is the words “tells it”, never colour alone").
 *
 * Under the hint (drawn here, 12 px over the view, as board E30 spaces it), one meta line says
 * how the telling is shared ("Mara Rus: 10 chapters · Teo Stan: 4"). The table is a real table
 * with no card around it, so a screen reader reads each mark with its chapter and its character;
 * on tablets and phones it scrolls sideways inside its own box, the chapter column first, never
 * the page (rule 21). The point of view comes from each chapter's plan, so the row's chapter
 * links there.
 * Who uses it: StorylinePage. What it calls: lib/povLanes.ts (the columns, the Narrator's last,
 * G10c2), lib/boardColumns.ts (the chapter numbers) and MetaLine.
 */
import { Link } from 'react-router';

import { MetaLine } from '@/components/ui/MetaLine';

import type { Storyline, StorylineChapter } from '../api/storyline';
import { chapterNumbers } from '../lib/boardColumns';
import { isToldBy, laneTellers, type LaneTeller } from '../lib/povLanes';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/** What the lanes need. */
export interface PovLanesViewProps {
  slug: string;
  storyline: Storyline;
  labelOf: (code: string) => string;
}

/** How the telling is shared: the first teller with "chapters", the rest with the number alone. */
function TellerCounts({
  tellers,
  chapters,
}: {
  tellers: LaneTeller[];
  chapters: StorylineChapter[];
}) {
  const { t } = useAtlasTranslation();
  const facts = tellers.map((teller, position) => {
    const name = teller.name ?? t('chapterPlan.narrator');
    const count = chapters.filter((chapter) => isToldBy(chapter, teller.id)).length;
    // Board E30: "Mara Rus: 10 chapters · Teo Stan: 4", the word said once.
    const key = position === 0 ? 'storyline.lanes.countFirst' : 'storyline.lanes.count';
    return { text: t(key, { name, count }) };
  });
  return <MetaLine facts={facts} label={t('storyline.lanes.countsLabel')} />;
}

/**
 * The row's name for a chapter: "1. Fifteen" for a numbered chapter (board E30), its label for a
 * prologue, interlude or epilogue ("Prologue: The lift").
 */
function useRowName(storyline: Storyline, labelOf: (code: string) => string) {
  const { t } = useAtlasTranslation();
  const numbers = chapterNumbers(storyline.chapters);
  return (chapter: StorylineChapter) => {
    const title = chapter.title === '' ? t('storyline.board.untitled') : chapter.title;
    const number = numbers.get(chapter.code);
    if (number !== undefined) return t('storyline.lanes.rowName', { number, title });
    return `${labelOf(chapter.code)}: ${title}`;
  };
}

/** One chapter's row: its name as a link to its plan, and "tells it" under whoever tells it. */
function LaneRow({
  slug,
  chapter,
  name,
  tellers,
}: {
  slug: string;
  chapter: StorylineChapter;
  name: string;
  tellers: LaneTeller[];
}) {
  const { t } = useAtlasTranslation();
  return (
    <tr data-testid="atlas-lane-row">
      <th
        scope="row"
        className="border-b border-hairline p-3 text-left align-top type-label font-semibold text-ink-heading"
      >
        <Link
          to={`/write/s/${slug}/c/${chapter.code}`}
          className="text-ink-heading no-underline hover:underline"
        >
          {name}
        </Link>
      </th>
      {tellers.map((character) => (
        <td
          key={character.id}
          className="border-b border-hairline p-3 text-left align-top type-label text-ink"
        >
          {isToldBy(chapter, character.id) && (
            <b className="font-semibold">{t('storyline.lanes.tellsIt')}</b>
          )}
        </td>
      ))}
    </tr>
  );
}

/** A column's heading: the character, or the Narrator with "outside the story" under it. */
function TellerHeading({ teller }: { teller: LaneTeller }) {
  const { t } = useAtlasTranslation();
  return (
    <th
      scope="col"
      className="border-b border-border px-3 py-2 text-left align-bottom type-meta font-semibold break-words text-ink-muted"
    >
      {teller.name ?? t('chapterPlan.narrator')}
      {/* The Narrator is nobody in the cast, so the column says so (board AtlasPov). */}
      {teller.name === null && (
        <span className="block font-normal">{t('chapterPlan.narratorOutside')}</span>
      )}
    </th>
  );
}

/** The table: a row per chapter in book order, a column per teller, "tells it" where they meet. */
function LanesTable({
  slug,
  storyline,
  labelOf,
  tellers,
}: PovLanesViewProps & { tellers: LaneTeller[] }) {
  const { t } = useAtlasTranslation();
  const rowName = useRowName(storyline, labelOf);
  // The box takes the focus so a keyboard can scroll it sideways; it is named after its table.
  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby="atlas-lanes-caption"
      className="tmc-focus max-w-full overflow-x-auto"
    >
      <table className="w-full min-w-[640px] border-collapse">
        <caption id="atlas-lanes-caption" className="sr-only">
          {t('storyline.lanes.caption')}
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="border-b border-border px-3 py-2 text-left align-bottom type-meta font-semibold text-ink-muted"
            >
              {t('storyline.lanes.chapterColumn')}
            </th>
            {tellers.map((teller) => (
              <TellerHeading key={teller.id} teller={teller} />
            ))}
          </tr>
        </thead>
        <tbody>
          {storyline.chapters.map((chapter) => (
            <LaneRow
              key={chapter.code}
              slug={slug}
              chapter={chapter}
              name={rowName(chapter)}
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
 * @returns the hint, then the counts line and the table, or a plain line when there is nothing
 *   to show
 */
export function PovLanesView({ slug, storyline, labelOf }: PovLanesViewProps) {
  const { t } = useAtlasTranslation();
  const tellers = laneTellers(storyline.characters, storyline.chapters);
  const hasChapters = storyline.chapters.length > 0;
  const hasTellers = tellers.length > 0;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="m-0 type-meta text-ink-muted">{t('storyline.lanes.hint')}</p>
      {!hasChapters && (
        <p className="m-0 type-body text-ink-muted">{t('storyline.lanes.noChapters')}</p>
      )}
      {hasChapters && !hasTellers && (
        <p className="m-0 type-body text-ink-muted">{t('storyline.lanes.none')}</p>
      )}
      {hasChapters && hasTellers && (
        <>
          <TellerCounts tellers={tellers} chapters={storyline.chapters} />
          <LanesTable slug={slug} storyline={storyline} labelOf={labelOf} tellers={tellers} />
        </>
      )}
    </div>
  );
}
