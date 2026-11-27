/**
 * EntriesTable: "Entries and results", every entry in one table the teacher can change (bundle
 * BOOKS-8, part 8b; board G12-CompetitionResults, user story 8.12).
 *
 * What it shows: one row per entrant, by name and never by points: the pupil and their story, a
 * score box per criterion, the total with "Same total" when another entry has it too, the class
 * points and teacher points as a guide, and the result (Winner, Finalist or Contestant; below
 * grade 8 every entry is a Contestant, so the column only says so). The table scrolls sideways
 * inside its own region on a narrow screen, so the page never does (CLAUDE.md rule 21).
 * Who shows it: ScoringWorkspace. What it calls: nothing; the workspace holds every score and
 * result.
 */
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextInput } from '@/components/ui/TextInput';

import type { CompetitionResult, Criterion } from '../api/classCompetitions';
import type { ScoringEntrant } from '../api/competitionScoring';
import { maxTotal } from '../lib/criteriaDraft';
import {
  sharedTotals,
  typedTotal,
  type ChosenResults,
  type TypedScores,
} from '../lib/resultsDraft';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/** What the table needs. */
export interface EntriesTableProps {
  criteria: Criterion[];
  entrants: ScoringEntrant[];
  areWinnersAllowed: boolean;
  typed: TypedScores;
  onType: (handle: string, criterionId: string, text: string) => void;
  chosen: ChosenResults;
  onChoose: (handle: string, result: CompetitionResult) => void;
}

/** The results in the board's order. */
const resultOrder: CompetitionResult[] = ['winner', 'finalist', 'participant'];

/** A body cell's classes. */
const cell = 'border-t border-border px-2 py-3 text-left align-top';

/**
 * The column headings: the pupil, each criterion with its most points, the total, the guides and
 * the result.
 *
 * @returns the head row
 */
function HeadRow({ criteria }: { criteria: Criterion[] }) {
  const { t } = useClassCompetitionsTranslation();
  const headings = [
    t('scoring.columnPupilChapter'),
    ...criteria.map((criterion) =>
      t('scoring.columnCriterion', { label: criterion.label, max: criterion.maxPoints }),
    ),
    t('scoring.columnTotalOf', { max: maxTotal(criteria) }),
    t('scoring.columnClassPoints'),
    t('scoring.columnTeacherPoints'),
    t('scoring.columnResult'),
  ];
  return (
    <thead>
      <tr>
        {headings.map((heading) => (
          <th key={heading} scope="col" className="px-2 py-2 text-left type-meta font-semibold">
            {heading}
          </th>
        ))}
      </tr>
    </thead>
  );
}

/** What one row needs. */
interface EntryRowProps {
  table: EntriesTableProps;
  entrant: ScoringEntrant;
  isSameTotal: boolean;
}

/**
 * The result column: the segmented choice, or "Contestant" below grade 8.
 *
 * @returns the cell's content
 */
function ResultChoice({ table, entrant }: EntryRowProps) {
  const { t } = useClassCompetitionsTranslation();
  if (!table.areWinnersAllowed) {
    return <span className="type-body text-ink">{t('results.participant')}</span>;
  }
  return (
    <SegmentedControl
      legend={t('scoring.resultFor', { name: entrant.displayName })}
      isLegendVisible={false}
      name={`result-${entrant.handle}`}
      options={resultOrder.map((value) => ({ value, label: t(`results.${value}`) }))}
      value={table.chosen[entrant.handle] ?? 'participant'}
      onChange={(result) => table.onChoose(entrant.handle, result)}
    />
  );
}

/**
 * One entrant's row.
 *
 * @returns the row
 */
function EntryRow(props: EntryRowProps) {
  const { t } = useClassCompetitionsTranslation();
  const { table, entrant } = props;
  const typed = table.typed[entrant.handle] ?? {};
  const total = typedTotal(table.criteria, typed);
  const story = entrant.chapters[0]?.storyTitle;
  return (
    <tr>
      <th scope="row" className={`${cell} min-w-32 font-normal`}>
        <span className="block type-label wrap-anywhere text-ink-heading">
          {entrant.displayName}
        </span>
        {story !== undefined && <span className="block type-meta wrap-anywhere">{story}</span>}
      </th>
      {table.criteria.map((criterion) => (
        <td key={criterion.id} className={cell}>
          <div className="w-16">
            <TextInput
              id={`table-score-${entrant.handle}-${criterion.id}`}
              label={t('scoring.scoreFor', {
                label: criterion.label,
                name: entrant.displayName,
                max: criterion.maxPoints,
              })}
              isLabelHidden
              inputMode="numeric"
              className="px-2 text-center"
              value={typed[criterion.id ?? ''] ?? ''}
              onChange={(event) =>
                table.onType(entrant.handle, criterion.id ?? '', event.target.value)
              }
            />
          </div>
        </td>
      ))}
      <td className={`${cell} type-body text-ink`}>
        {total ?? '–'}
        {props.isSameTotal && (
          <span className="block type-label text-ink-heading">{t('scoring.sameTotal')}</span>
        )}
      </td>
      <td className={`${cell} type-body text-ink`}>{entrant.classPoints}</td>
      <td className={`${cell} type-body text-ink`}>{entrant.teacherPoints}</td>
      <td className={`${cell} min-w-72`}>
        <ResultChoice {...props} />
      </td>
    </tr>
  );
}

/**
 * Renders the table.
 *
 * @returns the heading and the scrolling table
 */
export function EntriesTable(props: EntriesTableProps) {
  const { t } = useClassCompetitionsTranslation();
  // Step 1: the totals as typed, to mark the entries that share one.
  const totals: Record<string, number | null> = {};
  for (const entrant of props.entrants) {
    totals[entrant.handle] = typedTotal(props.criteria, props.typed[entrant.handle] ?? {});
  }
  const shared = sharedTotals(totals);
  return (
    <section aria-labelledby="entries-heading" className="flex flex-col gap-4">
      <h2 id="entries-heading" className="m-0 type-heading">
        {t('scoring.tableHeading')}
      </h2>
      {/* A region the keyboard can scroll, so a narrow phone never scrolls the page sideways. */}
      <div
        role="region"
        aria-labelledby="entries-heading"
        tabIndex={0}
        className="relative overflow-x-auto"
      >
        <table className="w-full min-w-[880px] border-collapse">
          <caption className="sr-only">{t('scoring.tableHeading')}</caption>
          <HeadRow criteria={props.criteria} />
          <tbody>
            {props.entrants.map((entrant) => (
              <EntryRow
                key={entrant.handle}
                table={props}
                entrant={entrant}
                isSameTotal={shared.has(entrant.handle)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
