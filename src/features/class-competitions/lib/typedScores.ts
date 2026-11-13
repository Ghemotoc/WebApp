/**
 * typedScores: turns what the teacher typed in the score fields into what the database takes
 * (bundle CLASS-POINTS, part 2; story S1-E8-17).
 *
 * Who calls it: EntrantScoreCard. What it calls: nothing.
 */
import type { Criterion } from '../api/classCompetitions';

/**
 * The score fields' starting text: the saved score, or empty.
 *
 * @param criteria - the competition's criteria
 * @param scores - the entrant's saved scores by criterion ID
 * @returns the text of each field by criterion ID
 */
export function typedFromScores(
  criteria: Criterion[],
  scores: Record<string, number>,
): Record<string, string> {
  const typed: Record<string, string> = {};
  for (const criterion of criteria) {
    if (criterion.id === null) continue;
    const saved = scores[criterion.id];
    typed[criterion.id] = saved === undefined ? '' : String(saved);
  }
  return typed;
}

/**
 * Reads the score fields. An empty field clears that score (null); anything that isn't a whole
 * number from 0 to the criterion's maximum makes the whole read fail.
 *
 * @param criteria - the competition's criteria
 * @param typed - the text of each field by criterion ID
 * @returns the scores to save, or null when a field holds something else
 */
export function scoresFromTyped(
  criteria: Criterion[],
  typed: Record<string, string>,
): Record<string, number | null> | null {
  const scores: Record<string, number | null> = {};
  for (const criterion of criteria) {
    if (criterion.id === null) continue;
    const text = (typed[criterion.id] ?? '').trim();
    if (text === '') {
      scores[criterion.id] = null;
      continue;
    }
    if (!/^\d{1,4}$/.test(text) || Number(text) > criterion.maxPoints) return null;
    scores[criterion.id] = Number(text);
  }
  return scores;
}
