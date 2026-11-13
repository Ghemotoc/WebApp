/**
 * ResultsForm: the teacher decides the results and confirms them (bundle CLASS-POINTS, part 2;
 * story S1-E8-17 criteria 4 to 8; Robert, 13 Nov 2026: the teacher assesses and decides, the
 * app never suggests or ranks, and results can't change once confirmed).
 *
 * What it shows: from the 8th grade up, one radio per entrant for the Winner (none chosen to
 * start with, by name), the Winner's chapter to show the class, a tick box
 * per other entrant for Finalist, and "Confirm the results", which asks once. Below the 8th
 * grade there is nothing to choose: every entrant is a Contestant, and the teacher only
 * confirms.
 * Who shows it: CompetitionResultsPage, while the competition is being assessed.
 * What it calls: usePublishCompetition → publish_class_competition(), which checks everything
 * again, locks the results, writes the class's log and sends the notices.
 */
import { useState } from 'react';

import { Notice } from '@/components/ui/Notice';
import { Select } from '@/components/ui/Select';
import { choiceRowClassName } from '@/components/ui/choiceRowStyles';

import type { CompetitionScoring, ScoringEntrant } from '../api/competitionScoring';
import { usePublishCompetition } from '../hooks/useCompetitionScoring';
import { useClassCompetitionsTranslation } from '../registerClassCompetitionsTranslations';

import { ConfirmedButton } from './ConfirmedButton';

/** What the teacher has chosen so far. */
interface Choice {
  /** The Winner's handle, or null until one is chosen. */
  winner: string | null;
  /** The Winner's chapter to show the class; empty for none. */
  chapterId: string;
  finalists: string[];
}

/** What the choice fields need. */
interface ChoiceFieldsProps {
  entrants: ScoringEntrant[];
  choice: Choice;
  onChange: (choice: Choice) => void;
}

/**
 * One radio per entrant for the Winner, then the Winner's chapter.
 *
 * @returns the Winner group
 */
function WinnerFields({ entrants, choice, onChange }: ChoiceFieldsProps) {
  const { t } = useClassCompetitionsTranslation();
  const winner = entrants.find((entrant) => entrant.handle === choice.winner);

  /** Chooses the Winner: their chapter starts empty and they stop being a Finalist. */
  function chooseWinner(handle: string) {
    const finalists = choice.finalists.filter((finalist) => finalist !== handle);
    onChange({ winner: handle, chapterId: '', finalists });
  }

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby="winner-hint">
      <legend className="p-0 font-heading text-lg font-bold text-heading">
        {t('scoring.winnerLegend')}
      </legend>
      <p id="winner-hint" className="m-0 text-sm text-body">
        {t('scoring.winnerHint')}
      </p>
      {entrants.map((entrant) => (
        <label key={entrant.handle} className={choiceRowClassName}>
          <span className="wrap-anywhere">{entrant.displayName}</span>
          <input
            type="radio"
            name="competition-winner"
            className="size-5 shrink-0 accent-primary"
            checked={choice.winner === entrant.handle}
            onChange={() => chooseWinner(entrant.handle)}
          />
        </label>
      ))}
      {winner !== undefined && (
        <Select
          id="competition-winning-chapter"
          label={t('scoring.winningChapter')}
          isLabelVisible
          placement="form"
          options={[
            { value: '', label: t('scoring.noChapter') },
            ...winner.chapters.map((chapter) => ({ value: chapter.id, label: chapter.title })),
          ]}
          value={choice.chapterId}
          onChange={(chapterId) => onChange({ ...choice, chapterId })}
        />
      )}
    </fieldset>
  );
}

/**
 * One tick box per entrant who isn't the Winner, for Finalist.
 *
 * @returns the Finalists group
 */
function FinalistFields({ entrants, choice, onChange }: ChoiceFieldsProps) {
  const { t } = useClassCompetitionsTranslation();

  /** Ticks or unticks one entrant. */
  function toggle(handle: string, isTicked: boolean) {
    const others = choice.finalists.filter((finalist) => finalist !== handle);
    onChange({ ...choice, finalists: isTicked ? [...others, handle] : others });
  }

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" aria-describedby="finalists-hint">
      <legend className="p-0 font-heading text-lg font-bold text-heading">
        {t('scoring.finalistsLegend')}
      </legend>
      <p id="finalists-hint" className="m-0 text-sm text-body">
        {t('scoring.finalistsHint')}
      </p>
      {entrants
        .filter((entrant) => entrant.handle !== choice.winner)
        .map((entrant) => (
          <label key={entrant.handle} className={choiceRowClassName}>
            <span className="wrap-anywhere">{entrant.displayName}</span>
            <input
              type="checkbox"
              className="size-5 shrink-0 accent-primary"
              checked={choice.finalists.includes(entrant.handle)}
              onChange={(event) => toggle(entrant.handle, event.target.checked)}
            />
          </label>
        ))}
    </fieldset>
  );
}

/**
 * Renders the form.
 *
 * @param props.scoring - the competition being assessed
 * @returns the choices and "Confirm the results"
 */
export function ResultsForm({ scoring }: { scoring: CompetitionScoring }) {
  const { t } = useClassCompetitionsTranslation();
  const publisher = usePublishCompetition();
  const [choice, setChoice] = useState<Choice>({ winner: null, chapterId: '', finalists: [] });
  const isReady = !scoring.areWinnersAllowed || choice.winner !== null;

  /** Confirms the results; the page then shows them locked. */
  function confirm() {
    const request = {
      competitionId: scoring.id,
      winner: scoring.areWinnersAllowed ? choice.winner : null,
      winningChapterId: choice.chapterId === '' ? null : choice.chapterId,
      finalists: scoring.areWinnersAllowed ? choice.finalists : [],
    };
    // The refusal, when there is one, shows through publisher.failure below.
    publisher.publish(request).catch(() => undefined);
  }

  return (
    <section
      aria-labelledby="results-heading"
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5 shadow-card md:p-6"
    >
      <h2 id="results-heading" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('scoring.resultsHeading')}
      </h2>
      {scoring.areWinnersAllowed ? (
        <>
          <WinnerFields entrants={scoring.entrants} choice={choice} onChange={setChoice} />
          <FinalistFields entrants={scoring.entrants} choice={choice} onChange={setChoice} />
        </>
      ) : (
        <p className="m-0 text-body">{t('scoring.noWinners')}</p>
      )}
      <ConfirmedButton
        label={t('scoring.confirm')}
        question={t('scoring.confirmQuestion')}
        yesLabel={t('scoring.confirmYes')}
        cancelLabel={t('scoring.cancel')}
        variant="primary"
        isDisabled={publisher.isRunning || !isReady}
        onConfirm={confirm}
      />
      <div aria-live="polite">
        {publisher.failure !== null && (
          <Notice tone="error">{t(`failures.${publisher.failure.failure}`)}</Notice>
        )}
      </div>
    </section>
  );
}
