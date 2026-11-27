/**
 * ScoringWorkspace: everything the teacher does while a competition is being scored (bundle
 * BOOKS-8, part 8b; board G12-CompetitionResults, user story 8.12).
 *
 * What it shows: the scoring card for one entry at a time, "Entries and results" with every entry,
 * Readers' choice and the publish footer. It holds the typed scores, the outcome ticks and the
 * chosen results in one place, so the card and the table always show the same numbers.
 * "Save as draft" saves the scores that changed; "Publish results" saves them, then publishes:
 * the database checks everything again and locks the results (GDPR art. 22: a person decides; the
 * app never picks).
 * Who shows it: CompetitionResultsPage, while the competition is being scored.
 * What it calls: useSaveScores → save_class_competition_scores(), usePublishCompetition →
 * publish_class_competition().
 */
import { useState } from 'react';

import type { CompetitionResult } from '../api/classCompetitions';
import type { CompetitionScoring } from '../api/competitionScoring';
import { usePublishCompetition, useSaveScores } from '../hooks/useCompetitionScoring';
import {
  changedScores,
  readersChoiceOf,
  winnerOf,
  withResult,
  type ChosenResults,
  type TypedScores,
} from '../lib/resultsDraft';
import { typedFromScores } from '../lib/typedScores';

import { EntriesTable } from './EntriesTable';
import { EntrantScoreCard } from './EntrantScoreCard';
import { PublishFooter, type FooterOutcome } from './PublishFooter';

/**
 * The saved scores as the fields' starting text, for every entrant.
 *
 * @param scoring - the competition
 * @returns the typed scores
 */
function startingText(scoring: CompetitionScoring): TypedScores {
  const typed: TypedScores = {};
  for (const entrant of scoring.entrants) {
    typed[entrant.handle] = typedFromScores(scoring.criteria, entrant.scores);
  }
  return typed;
}

/** The working state the actions read. */
interface WorkspaceState {
  typed: TypedScores;
  chosen: ChosenResults;
  chapterId: string;
  setOutcome: (outcome: FooterOutcome) => void;
}

/**
 * "Save as draft" and "Publish results".
 *
 * @param scoring - the competition
 * @param state - what the teacher typed and chose
 * @returns the two actions, the database's refusal and whether one is running
 */
function useResultsActions(scoring: CompetitionScoring, state: WorkspaceState) {
  const saver = useSaveScores();
  const publisher = usePublishCompetition();

  /** Saves every changed score; false when a field isn't a score or a save is refused. */
  async function saveChanged(): Promise<boolean> {
    const changed = changedScores(scoring.criteria, scoring.entrants, state.typed);
    if (changed === null) {
      state.setOutcome('range');
      return false;
    }
    state.setOutcome(null);
    // One entrant at a time, so a refusal stops before the next save.
    for (const entry of changed) {
      const saved = await saver
        .save({ competitionId: scoring.id, ...entry })
        .catch(() => undefined);
      if (saved === undefined) return false;
    }
    return true;
  }

  /** "Save as draft": the scores only; nothing is published. */
  async function saveDraft() {
    if (await saveChanged()) state.setOutcome('draftSaved');
  }

  /** "Publish results": the scores first, then the results; the page then shows them locked. */
  async function publish() {
    if (!(await saveChanged())) return;
    const finalists = Object.entries(state.chosen)
      .filter(([, result]) => result === 'finalist')
      .map(([handle]) => handle);
    const request = {
      competitionId: scoring.id,
      winner: scoring.areWinnersAllowed ? winnerOf(state.chosen) : null,
      winningChapterId: state.chapterId === '' ? null : state.chapterId,
      finalists: scoring.areWinnersAllowed ? finalists : [],
    };
    // The refusal, when there is one, shows through publisher.failure.
    await publisher.publish(request).catch(() => undefined);
  }

  return {
    saveDraft,
    publish,
    failure: saver.failure?.failure ?? publisher.failure?.failure ?? null,
    isRunning: saver.isRunning || publisher.isRunning,
  };
}

/**
 * The page's working state: the typed scores, the chosen results and the Winner's chapter.
 *
 * @param scoring - the competition
 * @returns the state and its changes
 */
function useWorkspace(scoring: CompetitionScoring) {
  const [typed, setTyped] = useState<TypedScores>(() => startingText(scoring));
  const [chosen, setChosen] = useState<ChosenResults>({});
  const [chapterId, setChapterId] = useState('');
  const [outcome, setOutcome] = useState<FooterOutcome>(null);

  /** Picks a result; a new Winner's chapter starts empty. */
  function choose(handle: string, result: CompetitionResult) {
    if (result === 'winner' || chosen[handle] === 'winner') setChapterId('');
    setChosen(withResult(chosen, handle, result));
  }

  /** Changes one typed score. */
  function type(handle: string, criterionId: string, text: string) {
    setTyped({ ...typed, [handle]: { ...typed[handle], [criterionId]: text } });
  }

  return { typed, type, chosen, choose, chapterId, setChapterId, outcome, setOutcome };
}

/**
 * Renders the workspace.
 *
 * @param props.scoring - the competition being scored
 * @returns the card, the table and the footer
 */
export function ScoringWorkspace({ scoring }: { scoring: CompetitionScoring }) {
  const work = useWorkspace(scoring);
  const actions = useResultsActions(scoring, work);
  const [index, setIndex] = useState(0);
  // The outcome ticks by entrant: a working note for the teacher, never saved.
  const [ticks, setTicks] = useState<Record<string, Record<string, boolean>>>({});
  const entrant = scoring.entrants[index];
  const winnerHandle = winnerOf(work.chosen);
  const winner = scoring.entrants.find((each) => each.handle === winnerHandle);
  const readersChoice = readersChoiceOf(scoring.entrants, winnerHandle);
  if (entrant === undefined) return null;
  return (
    <>
      <EntrantScoreCard
        criteria={scoring.criteria}
        entrant={entrant}
        number={index + 1}
        count={scoring.entrants.length}
        typed={work.typed[entrant.handle] ?? {}}
        onType={(criterionId, text) => work.type(entrant.handle, criterionId, text)}
        ticks={ticks[entrant.handle] ?? {}}
        onTick={(key, isTicked) =>
          setTicks({ ...ticks, [entrant.handle]: { ...ticks[entrant.handle], [key]: isTicked } })
        }
        onMove={(step) => setIndex(index + step)}
      />
      <EntriesTable
        criteria={scoring.criteria}
        entrants={scoring.entrants}
        areWinnersAllowed={scoring.areWinnersAllowed}
        typed={work.typed}
        onType={work.type}
        chosen={work.chosen}
        onChoose={work.choose}
      />
      <PublishFooter
        areWinnersAllowed={scoring.areWinnersAllowed}
        readersChoice={scoring.entrants.filter((each) => readersChoice.includes(each.handle))}
        winner={winner}
        chapterId={work.chapterId}
        onChapter={work.setChapterId}
        outcome={work.outcome}
        failure={actions.failure}
        isRunning={actions.isRunning}
        onSaveDraft={() => void actions.saveDraft()}
        onPublish={() => void actions.publish()}
        onMissingWinner={() => work.setOutcome('pickWinner')}
      />
    </>
  );
}
