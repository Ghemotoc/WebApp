/**
 * criteriaDraft: small pure helpers for editing a list of criteria in a form (bundle
 * CLASS-POINTS, part 2; stories S1-E8-15 and S1-E8-19). Each one returns a new list and leaves
 * the old one alone, so React sees the change.
 *
 * Who calls it: CriteriaEditor, CompetitionFormPage and CriteriaTemplatesPage.
 * What it calls: nothing.
 */
import type { Criterion } from '../api/classCompetitions';

/** The limits the database also checks (save_class_competition, save_criteria_template). */
export const criteriaLimits = {
  maxCriteria: 6,
  maxOutcomes: 8,
  labelLength: 80,
  descriptionLength: 500,
  outcomeLength: 200,
} as const;

/**
 * A criterion with nothing written yet: one empty outcome line, so the teacher sees where the
 * outcomes go.
 *
 * @returns the empty criterion
 */
export function emptyCriterion(): Criterion {
  return { id: null, label: '', maxPoints: 10, description: '', outcomes: [''] };
}

/**
 * Changes one criterion of the list.
 *
 * @param criteria - the list
 * @param index - which criterion
 * @param change - the fields to replace
 * @returns the new list
 */
export function withCriterion(
  criteria: Criterion[],
  index: number,
  change: Partial<Criterion>,
): Criterion[] {
  return criteria.map((criterion, position) =>
    position === index ? { ...criterion, ...change } : criterion,
  );
}

/**
 * Takes one criterion out of the list.
 *
 * @param criteria - the list
 * @param index - which criterion
 * @returns the new list
 */
export function withoutCriterion(criteria: Criterion[], index: number): Criterion[] {
  return criteria.filter((_criterion, position) => position !== index);
}

/**
 * Changes one outcome line of a criterion.
 *
 * @param criterion - the criterion
 * @param index - which outcome
 * @param text - the new line
 * @returns the criterion with that line replaced
 */
export function withOutcome(criterion: Criterion, index: number, text: string): Criterion {
  const outcomes = criterion.outcomes.map((outcome, position) =>
    position === index ? text : outcome,
  );
  return { ...criterion, outcomes };
}

/**
 * Takes one outcome line out of a criterion.
 *
 * @param criterion - the criterion
 * @param index - which outcome
 * @returns the criterion without that line
 */
export function withoutOutcome(criterion: Criterion, index: number): Criterion {
  const outcomes = criterion.outcomes.filter((_outcome, position) => position !== index);
  return { ...criterion, outcomes };
}

/**
 * Reads what the teacher typed as whole points.
 *
 * @param typed - the field's text
 * @returns the number, or 0 when it isn't a whole number (the database then refuses the save
 *   with a plain message)
 */
export function pointsFromTyped(typed: string): number {
  return /^\d{1,4}$/.test(typed.trim()) ? Number(typed.trim()) : 0;
}

/**
 * A copy of a template's criteria for a form: no row IDs, so saving the competition creates its
 * own rows and the template stays as it is (S1-E8-19 criterion 3).
 *
 * @param criteria - the template's criteria
 * @returns the copies
 */
export function copiedCriteria(criteria: Criterion[]): Criterion[] {
  return criteria.map((criterion) => ({
    ...criterion,
    id: null,
    outcomes: [...criterion.outcomes],
  }));
}

/**
 * The most points an entrant can get across the criteria.
 *
 * @param criteria - the competition's criteria
 * @returns the sum of the maximums
 */
export function maxTotal(criteria: Criterion[]): number {
  return criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
}

/**
 * An entrant's total across the criteria, or null while any criterion has no score.
 *
 * @param criteria - the competition's criteria
 * @param scores - the entrant's scores by criterion ID
 * @returns the total, or null when a score is missing
 */
export function totalOf(criteria: Criterion[], scores: Record<string, number>): number | null {
  let total = 0;
  for (const criterion of criteria) {
    const points = criterion.id === null ? undefined : scores[criterion.id];
    if (points === undefined) return null;
    total += points;
  }
  return total;
}
