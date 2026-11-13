/**
 * Why a class competition call was refused (bundle CLASS-POINTS, part 2; stories S1-E8-15 and
 * S1-E8-19).
 *
 * Who calls it: the three API files beside it, which turn Postgres's hint into one of these.
 * What it calls: nothing. The screens show failures.<failure> from classCompetitions.json.
 */

/** The failures a screen can show. */
export type CompetitionFailure =
  | 'grade_range'
  | 'grade_running'
  | 'needs_grade'
  | 'name'
  | 'dates'
  | 'exists'
  | 'started'
  | 'missing'
  | 'closed'
  | 'not_open'
  | 'published'
  | 'not_judging'
  | 'no_entrants'
  | 'winner'
  | 'no_winners'
  | 'not_entrant'
  | 'twice'
  | 'unscored'
  | 'chapter'
  | 'criteria_count'
  | 'criteria_label'
  | 'criteria_points'
  | 'criteria_description'
  | 'criteria_outcomes'
  | 'criteria_html'
  | 'score_range'
  | 'score_criterion'
  | 'template_name'
  | 'template_name_taken'
  | 'template_too_many'
  | 'template_missing'
  | 'not_teacher'
  | 'signed_out'
  | 'archived'
  | 'not_allowed'
  | 'unreachable';

/** The error a refused call throws. */
export class CompetitionError extends Error {
  constructor(readonly failure: CompetitionFailure) {
    super(`The class competition call was refused: ${failure}`);
    this.name = 'CompetitionError';
  }
}

/** The database's hints and the failure each one means. */
const failureForHint: Record<string, CompetitionFailure> = {
  'grade:range': 'grade_range',
  'grade:running': 'grade_running',
  'competition:grade': 'needs_grade',
  'competition:name': 'name',
  'competition:dates': 'dates',
  'competition:exists': 'exists',
  'competition:started': 'started',
  'competition:missing': 'missing',
  'competition:closed': 'closed',
  'competition:not_open': 'not_open',
  'competition:published': 'published',
  'competition:not_judging': 'not_judging',
  'competition:no_entrants': 'no_entrants',
  'competition:winner': 'winner',
  'competition:no_winners': 'no_winners',
  'competition:not_entrant': 'not_entrant',
  'competition:twice': 'twice',
  'competition:unscored': 'unscored',
  'competition:chapter': 'chapter',
  'competition:not_teacher': 'not_teacher',
  'criteria:count': 'criteria_count',
  'criteria:label': 'criteria_label',
  'criteria:points': 'criteria_points',
  'criteria:description': 'criteria_description',
  'criteria:outcomes': 'criteria_outcomes',
  'criteria:html': 'criteria_html',
  'score:range': 'score_range',
  'score:criterion': 'score_criterion',
  'template:name': 'template_name',
  'template:name_taken': 'template_name_taken',
  'template:too_many': 'template_too_many',
  'template:missing': 'template_missing',
  'template:not_teacher': 'not_teacher',
  signed_out: 'signed_out',
  'space:archived': 'archived',
  'space:not_class': 'not_allowed',
  'space:not_allowed': 'not_allowed',
};

/**
 * Turns a database error into a CompetitionError.
 *
 * @param error - Postgres's hint and code
 * @returns the failure by hint; "not allowed" for any other refusal by role; otherwise unreachable
 */
export function competitionErrorFrom(error: {
  hint?: string | null;
  code?: string | null;
}): CompetitionError {
  const byHint = failureForHint[error.hint ?? ''];
  if (byHint !== undefined) return new CompetitionError(byHint);
  // 42501 is Postgres's "insufficient privilege": someone without the power tried.
  return new CompetitionError(error.code === '42501' ? 'not_allowed' : 'unreachable');
}

/**
 * The failure a call ended with, as a CompetitionError.
 *
 * @param error - whatever the call threw
 * @returns the error, or null when there is none
 */
export function competitionFailureOf(error: Error | null): CompetitionError | null {
  if (error === null) return null;
  return error instanceof CompetitionError ? error : new CompetitionError('unreachable');
}
