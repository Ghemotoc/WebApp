/**
 * EntrantScoreCard: the teacher scores one entry at a time (bundle CLASS-POINTS, part 2; story
 * S1-E8-17 criteria 1 to 3; redrawn by BOOKS-8 part 8b, board G12-CompetitionResults, user story
 * 8.12; Robert, 13 Nov 2026, 19:20 UTC: the outcomes show as a checklist beside the score).
 *
 * What it shows: "Scoring 1 of 5", the pupil and their story with "Read the entry", the hint, and
 * for each criterion its name, description, outcome tick boxes and a score box "of 10"; under
 * them "Total 22 of 25 · class points 17 · teacher points 8 (a guide)" with Previous and Next
 * entry. The ticks help the teacher think and are never saved or sent; the scores are the same
 * ones the table below shows, and are saved by "Save as draft" or "Publish results".
 * Who shows it: ScoringWorkspace. What it calls: nothing; the workspace holds every score.
 */
import { Link } from 'react-router';

import { Button } from '@/components/ui/Button';
import { buttonClassName } from '@/components/ui/buttonStyles';
import { ButtonRow } from '@/components/ui/ButtonRow';
import { TextInput } from '@/components/ui/TextInput';

import type { Criterion } from '../api/classCompetitions';
import type { ScoringEntrant } from '../api/competitionScoring';
import { maxTotal } from '../lib/criteriaDraft';
import { typedTotal } from '../lib/resultsDraft';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/** What the card needs. */
export interface EntrantScoreCardProps {
  criteria: Criterion[];
  entrant: ScoringEntrant;
  /** The entry's place among the entries, from 1, and how many there are. */
  number: number;
  count: number;
  /** What was typed for this entrant, by criterion ID. */
  typed: Record<string, string>;
  onType: (criterionId: string, text: string) => void;
  /** The outcome ticks, by "criterion ID:outcome index"; a working note, never saved. */
  ticks: Record<string, boolean>;
  onTick: (key: string, isTicked: boolean) => void;
  onMove: (step: -1 | 1) => void;
}

/**
 * The card's heading: the pupil and their story, and a link to the first chapter they shared.
 *
 * @returns the position line, the heading and "Read the entry"
 */
function EntryHeading({ entrant, number, count }: EntrantScoreCardProps) {
  const { t } = useClassCompetitionsTranslation();
  const chapter = entrant.chapters[0];
  const heading =
    chapter === undefined
      ? entrant.displayName
      : t('scoring.cardHeading', { name: entrant.displayName, story: chapter.storyTitle });
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="m-0 type-meta">{t('scoring.cardPosition', { number, count })}</p>
        <h2
          id="scoring-card-heading"
          className="m-0 type-subheading wrap-anywhere text-ink-heading"
        >
          {heading}
        </h2>
      </div>
      {chapter !== undefined && (
        <Link
          to={`/s/${chapter.storySlug}/${chapter.code}`}
          className={buttonClassName({ variant: 'text' })}
        >
          {t('scoring.readEntry')}
        </Link>
      )}
    </div>
  );
}

/** What one criterion's block needs. */
interface CriterionBlockProps {
  card: EntrantScoreCardProps;
  criterion: Criterion;
}

/**
 * One criterion: its name, description and outcome ticks, with the score box beside them.
 *
 * @returns the block
 */
function CriterionBlock({ card, criterion }: CriterionBlockProps) {
  const { t } = useClassCompetitionsTranslation();
  const criterionId = criterion.id ?? '';
  const fieldId = `card-score-${card.entrant.handle}-${criterionId}`;
  return (
    <div className="flex gap-4 border-t border-border pt-4">
      <fieldset className="m-0 flex min-w-0 flex-1 flex-col gap-2 border-0 p-0">
        <legend className="p-0 type-label text-ink-heading">{criterion.label}</legend>
        <p className="m-0 type-meta">{criterion.description}</p>
        {criterion.outcomes.map((outcome, index) => {
          const key = `${criterionId}:${index}`;
          return (
            <label key={key} className="flex min-h-6 cursor-pointer items-start gap-3 type-body">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
                checked={card.ticks[key] === true}
                onChange={(event) => card.onTick(key, event.target.checked)}
              />
              <span className="wrap-anywhere text-ink">{outcome}</span>
            </label>
          );
        })}
      </fieldset>
      <div className="flex shrink-0 items-center gap-2 self-start">
        <div className="w-16">
          <TextInput
            id={fieldId}
            label={t('scoring.scoreFor', {
              label: criterion.label,
              name: card.entrant.displayName,
              max: criterion.maxPoints,
            })}
            isLabelHidden
            inputMode="numeric"
            className="px-2 text-center"
            value={card.typed[criterionId] ?? ''}
            onChange={(event) => card.onType(criterionId, event.target.value)}
          />
        </div>
        <span className="type-meta">{t('scoring.outOf', { max: criterion.maxPoints })}</span>
      </div>
    </div>
  );
}

/**
 * The card's foot: the total and the guide numbers, then Previous and Next entry.
 *
 * @returns the line and the buttons
 */
function CardFoot(props: EntrantScoreCardProps) {
  const { t } = useClassCompetitionsTranslation();
  const max = maxTotal(props.criteria);
  const total = typedTotal(props.criteria, props.typed);
  const guide = {
    classPoints: props.entrant.classPoints,
    teacherPoints: props.entrant.teacherPoints,
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
      <p className="m-0 type-meta" aria-live="polite">
        <span className="font-semibold text-ink">
          {total === null
            ? t('scoring.cardTotalNone', { max })
            : t('scoring.cardTotal', { total, max })}
        </span>
        {' · '}
        {t('scoring.cardGuide', guide)}
      </p>
      <ButtonRow>
        <Button variant="secondary" disabled={props.number === 1} onClick={() => props.onMove(-1)}>
          {t('scoring.previous')}
        </Button>
        <Button
          variant="secondary"
          disabled={props.number === props.count}
          onClick={() => props.onMove(1)}
        >
          {t('scoring.next')}
        </Button>
      </ButtonRow>
    </div>
  );
}

/**
 * Renders the card.
 *
 * @returns the entry being scored
 */
export function EntrantScoreCard(props: EntrantScoreCardProps) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <section
      aria-labelledby="scoring-card-heading"
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6"
    >
      <EntryHeading {...props} />
      <p className="m-0 type-meta">{t('scoring.checklistHint')}</p>
      {props.criteria.map((criterion) => (
        <CriterionBlock key={criterion.id} card={props} criterion={criterion} />
      ))}
      <CardFoot {...props} />
    </section>
  );
}
