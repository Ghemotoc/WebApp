/**
 * resultsDraft: the sums behind the results page while the teacher scores and decides (bundle
 * BOOKS-8, part 8b; board G12-CompetitionResults, user story 8.12).
 *
 * The page keeps every entrant's typed scores and chosen result in one place, so the scoring
 * card and the table show the same numbers. Nothing here ranks or suggests: the totals are the
 * teacher's own scores, "Same total" only marks a tie, and Readers' choice follows the class
 * points exactly as the database does when the results are published (mark_readers_choice()).
 * Who calls it: ScoringWorkspace, EntriesTable, EntrantScoreCard. What it calls: typedScores.
 */
import type { CompetitionResult, Criterion } from '../api/classCompetitions';
import type { ScoringEntrant } from '../api/competitionScoring';

import { scoresFromTyped } from './typedScores';

/** What the teacher typed: score text by criterion ID, by entrant's username. */
export type TypedScores = Record<string, Record<string, string>>;

/** The result chosen for each entrant, by username. */
export type ChosenResults = Record<string, CompetitionResult>;

/** One entrant's changed scores, ready to save. */
export interface ScoresToSave {
  handle: string;
  scores: Record<string, number | null>;
}

/**
 * The total of what was typed for one entrant.
 *
 * @param criteria - the competition's criteria
 * @param typed - one entrant's score text by criterion ID
 * @returns the sum, or null while a field is empty or not a score
 */
export function typedTotal(criteria: Criterion[], typed: Record<string, string>): number | null {
  const scores = scoresFromTyped(criteria, typed);
  if (scores === null) return null;
  let total = 0;
  // Step 1: every criterion needs a score before there is a total.
  for (const points of Object.values(scores)) {
    if (points === null) return null;
    total += points;
  }
  return total;
}

/**
 * The entrants whose total equals someone else's, for "Same total" (board G12: "Same totals are
 * marked, and nothing is chosen in advance").
 *
 * @param totals - each entrant's total by username, or null when not scored yet
 * @returns the usernames that share a total
 */
export function sharedTotals(totals: Record<string, number | null>): Set<string> {
  const seen = new Map<number, string[]>();
  // Step 1: group the usernames by total, leaving out the unscored.
  for (const [handle, total] of Object.entries(totals)) {
    if (total === null) continue;
    seen.set(total, [...(seen.get(total) ?? []), handle]);
  }
  // Step 2: keep only the groups of two or more.
  const shared = new Set<string>();
  for (const handles of seen.values()) {
    if (handles.length > 1) handles.forEach((handle) => shared.add(handle));
  }
  return shared;
}

/**
 * Who gets Readers' choice: the entrants with the most class points who aren't the Winner; a tie
 * shares it, and nobody gets it when nobody received class points (as mark_readers_choice()).
 *
 * @param entrants - the entrants with their class points
 * @param winner - the chosen Winner's username, or null
 * @returns the usernames, by name as the entrants come
 */
export function readersChoiceOf(entrants: ScoringEntrant[], winner: string | null): string[] {
  const most = Math.max(0, ...entrants.map((entrant) => entrant.classPoints));
  if (most === 0) return [];
  return entrants
    .filter((entrant) => entrant.classPoints === most && entrant.handle !== winner)
    .map((entrant) => entrant.handle);
}

/**
 * Sets one entrant's result. There is exactly one Winner (S1-E8-15, decision 2), so choosing a new
 * Winner makes the old one a Contestant again.
 *
 * @param chosen - the results so far
 * @param handle - the entrant
 * @param result - the result picked for them
 * @returns the new results
 */
export function withResult(
  chosen: ChosenResults,
  handle: string,
  result: CompetitionResult,
): ChosenResults {
  const next: ChosenResults = {};
  for (const [other, otherResult] of Object.entries(chosen)) {
    const wasWinner = otherResult === 'winner' && result === 'winner';
    next[other] = wasWinner ? 'participant' : otherResult;
  }
  next[handle] = result;
  return next;
}

/**
 * The Winner's username, or null while nobody is the Winner.
 *
 * @param chosen - the results so far
 * @returns the username
 */
export function winnerOf(chosen: ChosenResults): string | null {
  const found = Object.entries(chosen).find(([, result]) => result === 'winner');
  return found === undefined ? null : found[0];
}

/**
 * The scores that changed since the last save, for "Save as draft" and before "Publish results".
 *
 * @param criteria - the competition's criteria
 * @param entrants - the entrants with their saved scores
 * @param typed - what the teacher typed
 * @returns one entry per entrant whose scores changed, or null when a field isn't a score
 */
export function changedScores(
  criteria: Criterion[],
  entrants: ScoringEntrant[],
  typed: TypedScores,
): ScoresToSave[] | null {
  const changed: ScoresToSave[] = [];
  for (const entrant of entrants) {
    // Step 1: read the fields; one bad field stops the whole save, so nothing half-saves.
    const scores = scoresFromTyped(criteria, typed[entrant.handle] ?? {});
    if (scores === null) return null;
    // Step 2: keep the entrant only when a score differs from the saved one.
    const differs = Object.entries(scores).some(
      ([criterionId, points]) => (entrant.scores[criterionId] ?? null) !== points,
    );
    if (differs) changed.push({ handle: entrant.handle, scores });
  }
  return changed;
}
