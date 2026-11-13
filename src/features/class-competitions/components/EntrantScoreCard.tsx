/**
 * EntrantScoreCard: the teacher scores one entrant on each criterion (bundle CLASS-POINTS, part
 * 2; story S1-E8-17 criteria 1 to 3; Robert, 13 Nov 2026, 19:20 UTC: the outcomes show as a
 * checklist beside the score).
 *
 * What it shows: the entrant's pen name, their class points and teacher points as a guide, the
 * chapters they shared with the class and, for each criterion, its description, its outcomes
 * as tick boxes and the score field beside them. The ticks help the teacher think and are never
 * saved or sent. Under the criteria: the total and "Save scores".
 * Who shows it: CompetitionResultsPage, once per entrant, while the competition is being
 * assessed. What it calls: useSaveScores → save_class_competition_scores(), which answers only
 * the class's teacher.
 */
import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { Criterion } from '../api/classCompetitions';
import type { ScoringEntrant } from '../api/competitionScoring';
import { useSaveScores } from '../hooks/useCompetitionScoring';
import { maxTotal, totalOf } from '../lib/criteriaDraft';
import { scoresFromTyped, typedFromScores } from '../lib/typedScores';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

/** What the card needs. */
export interface EntrantScoreCardProps {
  competitionId: string;
  criteria: Criterion[];
  entrant: ScoringEntrant;
}

/**
 * The guide numbers and the chapters the entrant shared with the class.
 *
 * @param props.entrant - the entrant
 * @returns the two lines and the chapter list
 */
function EntrantGuide({ entrant }: { entrant: ScoringEntrant }) {
  const { t } = useClassCompetitionsTranslation();
  const guide = { classPoints: entrant.classPoints, teacherPoints: entrant.teacherPoints };
  return (
    <div className="flex flex-col gap-1.5 text-sm text-body">
      <p className="m-0">{t('scoring.guide', guide)}</p>
      {entrant.chapters.length === 0 ? (
        <p className="m-0">{t('scoring.noChapters')}</p>
      ) : (
        <>
          <p className="m-0 font-semibold text-ink">{t('scoring.chapters')}</p>
          <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
            {entrant.chapters.map((chapter) => (
              <li key={chapter.id} className="wrap-anywhere">
                {t('winner.chapterLink', { chapter: chapter.title, story: chapter.storyTitle })}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** What one criterion's row needs. */
interface CriterionScoreRowProps {
  /** A prefix for ids: one entrant's one criterion. */
  fieldId: string;
  criterion: Criterion;
  typed: string;
  onType: (text: string) => void;
}

/**
 * One criterion: its description and outcome tick boxes on one side, the score on the other.
 *
 * @returns the row
 */
function CriterionScoreRow({ fieldId, criterion, typed, onType }: CriterionScoreRowProps) {
  const { t } = useClassCompetitionsTranslation();
  return (
    <div className="grid gap-3 rounded-2xl border border-border px-4 py-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-start">
      <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
        <legend className="p-0 font-semibold text-ink">{criterion.label}</legend>
        <p className="m-0 text-sm text-body">{criterion.description}</p>
        {criterion.outcomes.map((outcome, index) => (
          <label
            key={index}
            className="flex min-h-6 cursor-pointer items-start gap-2 text-sm text-body"
          >
            {/* Uncontrolled on purpose: a tick is the teacher's working note, never saved. */}
            <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" />
            <span className="wrap-anywhere">{outcome}</span>
          </label>
        ))}
      </fieldset>
      <TextInput
        id={fieldId}
        label={t('scoring.scoreLabel', { label: criterion.label, max: criterion.maxPoints })}
        inputMode="numeric"
        value={typed}
        onChange={(event) => onType(event.target.value)}
      />
    </div>
  );
}

/** What the last press ended with; "range" is said under the fields. */
type Outcome = 'saved' | 'range' | null;

/**
 * Renders the card.
 *
 * @returns the entrant's form
 */
export function EntrantScoreCard({ competitionId, criteria, entrant }: EntrantScoreCardProps) {
  const { t } = useClassCompetitionsTranslation();
  const saver = useSaveScores();
  const [typed, setTyped] = useState(() => typedFromScores(criteria, entrant.scores));
  const [outcome, setOutcome] = useState<Outcome>(null);
  const total = totalOf(criteria, entrant.scores);
  const headingId = `entrant-${entrant.handle}-heading`;

  /** Saves the scores. The database checks the range too; saying so here saves a round trip. */
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scores = scoresFromTyped(criteria, typed);
    if (scores === null) {
      setOutcome('range');
      return;
    }
    setOutcome(null);
    const request = { competitionId, handle: entrant.handle, scores };
    const saved = await saver.save(request).catch(() => undefined);
    if (saved !== undefined) setOutcome('saved');
  }

  return (
    <form
      onSubmit={save}
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card md:p-6"
    >
      <h3 id={headingId} className="m-0 font-heading text-xl font-bold wrap-anywhere text-heading">
        {entrant.displayName}
      </h3>
      <EntrantGuide entrant={entrant} />
      <p className="m-0 text-[13px] text-meta">{t('scoring.checklistHint')}</p>
      {criteria.map((criterion) => (
        <CriterionScoreRow
          key={criterion.id}
          fieldId={`score-${entrant.handle}-${criterion.id}`}
          criterion={criterion}
          typed={typed[criterion.id ?? ''] ?? ''}
          onType={(text) => setTyped({ ...typed, [criterion.id ?? '']: text })}
        />
      ))}
      <p className="m-0 font-semibold text-ink">
        {total === null
          ? t('scoring.notScored')
          : t('scoring.total', { total, max: maxTotal(criteria) })}
      </p>
      <Button type="submit" variant="secondary" className="w-fit" disabled={saver.isRunning}>
        {t('scoring.saveScores', { name: entrant.displayName })}
      </Button>
      <div aria-live="polite">
        {outcome === 'range' && <Notice tone="error">{t('failures.score_range')}</Notice>}
        {saver.failure !== null && outcome === null && (
          <Notice tone="error">{t(`failures.${saver.failure.failure}`)}</Notice>
        )}
        {outcome === 'saved' && <Notice tone="success">{t('scoring.scoresSaved')}</Notice>}
      </div>
    </form>
  );
}
