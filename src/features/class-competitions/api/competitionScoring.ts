/**
 * Scoring a class competition and confirming its results (bundle CLASS-POINTS, part 2; story
 * S1-E8-15).
 *
 * Who calls it: hooks/useCompetitionScoring.ts, for the class's teacher only. What it calls
 * next: class_competition_scoring(), save_class_competition_scores() and
 * publish_class_competition().
 *
 * The app never names or suggests a Winner (GDPR art. 22: a person decides): entrants arrive by
 * name, with their class points and teacher points as a guide, and the teacher chooses.
 */
import { numberFrom, objectFrom } from '@/features/class-points/api/classPoints';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import {
  classCompetitionsFrom,
  criterionFrom,
  listOf,
  resultFrom,
  textOf,
  type ClassCompetitions,
  type CompetitionPhase,
  type CompetitionResult,
  type Criterion,
} from './classCompetitions';
import { competitionErrorFrom } from './competitionErrors';

/** A chapter an entrant shared with the class. */
export interface EntrantChapter {
  id: string;
  title: string;
  storyTitle: string;
  position: number;
}

/** One pupil who joined, as the teacher scores them. */
export interface ScoringEntrant {
  handle: string;
  displayName: string;
  /** Guides only: what the pupil received in the class during the competition. */
  classPoints: number;
  teacherPoints: number;
  chapters: EntrantChapter[];
  /** The teacher's score by criterion ID; a criterion not scored yet is absent. */
  scores: Record<string, number>;
  /** Set once the results are published. */
  result: CompetitionResult | null;
  isReadersChoice: boolean;
}

/** Everything the results page needs. */
export interface CompetitionScoring {
  id: string;
  name: string;
  phase: CompetitionPhase;
  classSlug: string;
  areWinnersAllowed: boolean;
  criteria: Criterion[];
  entrants: ScoringEntrant[];
}

/**
 * Reads scores by criterion.
 *
 * @param value - {criterion id: points}
 * @returns the same, numbers only
 */
export function scoresFrom(value: Json | undefined): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const [criterionId, points] of Object.entries(objectFrom(value) ?? {})) {
    if (typeof points === 'number') scores[criterionId] = points;
  }
  return scores;
}

/**
 * Reads one entrant.
 *
 * @param value - an entry of class_competition_scoring()'s entrants
 * @returns the entrant
 */
function entrantFrom(value: Json): ScoringEntrant {
  const entry = objectFrom(value) ?? {};
  return {
    handle: textOf(entry.handle),
    displayName: textOf(entry.display_name),
    classPoints: numberFrom(entry.class_points),
    teacherPoints: numberFrom(entry.teacher_points),
    chapters: listOf(entry.chapters).map((chapterValue) => {
      const chapter = objectFrom(chapterValue) ?? {};
      return {
        id: textOf(chapter.id),
        title: textOf(chapter.title),
        storyTitle: textOf(chapter.story_title),
        position: numberFrom(chapter.position),
      };
    }),
    scores: scoresFrom(entry.scores),
    result: resultFrom(entry.result),
    isReadersChoice: entry.readers_choice === true,
  };
}

/**
 * Reads class_competition_scoring()'s answer.
 *
 * @param value - the JSON the database returned
 * @returns the scoring page's data
 */
export function scoringFrom(value: Json): CompetitionScoring {
  const answer = objectFrom(value) ?? {};
  const phase = answer.phase;
  return {
    id: textOf(answer.id),
    name: textOf(answer.name),
    phase: phase === 'upcoming' || phase === 'open' || phase === 'published' ? phase : 'judging',
    classSlug: textOf(answer.class_slug),
    areWinnersAllowed: answer.winners_allowed === true,
    criteria: listOf(answer.criteria).map(criterionFrom),
    entrants: listOf(answer.entrants).map(entrantFrom),
  };
}

/**
 * The entrants of a competition, for its teacher.
 *
 * @param client - the signed-in Supabase client
 * @param competitionId - the competition's ID
 * @returns the scoring page's data
 * @throws CompetitionError: missing for anyone but the class's teacher
 */
export async function fetchCompetitionScoring(
  client: AppSupabaseClient,
  competitionId: string,
): Promise<CompetitionScoring> {
  const { data, error } = await client.rpc('class_competition_scoring', {
    target_competition_id: competitionId,
  });
  if (error !== null) throw competitionErrorFrom(error);
  return scoringFrom(data);
}

/** One entrant's scores, as the form sends them. */
export interface ScoresRequest {
  competitionId: string;
  handle: string;
  /** Points by criterion ID; null clears a score. */
  scores: Record<string, number | null>;
}

/**
 * The teacher scores one entrant.
 *
 * @param client - the signed-in Supabase client
 * @param request - the competition, the entrant's username and the scores
 * @returns the entrant's saved scores
 * @throws CompetitionError: not_judging, not_entrant, score_range, score_criterion
 */
export async function saveCompetitionScores(
  client: AppSupabaseClient,
  request: ScoresRequest,
): Promise<Record<string, number>> {
  const { data, error } = await client.rpc('save_class_competition_scores', {
    target_competition_id: request.competitionId,
    pupil_handle: request.handle,
    scores: request.scores,
  });
  if (error !== null) throw competitionErrorFrom(error);
  return scoresFrom(data);
}

/** The results the teacher confirms. Every entrant not named is a Contestant. */
export interface ResultsRequest {
  competitionId: string;
  /** The Winner's username; null below the 8th grade. */
  winner: string | null;
  winningChapterId: string | null;
  finalists: string[];
}

/**
 * The teacher confirms the results; the competition then locks.
 *
 * @param client - the signed-in Supabase client
 * @param request - the Winner, their chapter and the Finalists
 * @returns the class's competitions after the change
 * @throws CompetitionError: winner, no_winners, twice, unscored, chapter, no_entrants,
 *   not_judging
 */
export async function publishCompetition(
  client: AppSupabaseClient,
  request: ResultsRequest,
): Promise<ClassCompetitions | null> {
  const { data, error } = await client.rpc('publish_class_competition', {
    target_competition_id: request.competitionId,
    results: {
      winner: request.winner,
      winning_chapter_id: request.winningChapterId,
      finalists: request.finalists,
    },
  });
  if (error !== null) throw competitionErrorFrom(error);
  return classCompetitionsFrom(data);
}
