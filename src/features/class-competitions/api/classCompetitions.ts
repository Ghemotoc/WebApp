/**
 * Class competitions (bundle CLASS-POINTS, part 2; story S1-E8-15): what a class page says about
 * competitions, and the calls a teacher and a pupil make.
 *
 * Who calls it: hooks/useClassCompetitions.ts. What it calls next: class_competitions(),
 * set_class_grade(), save_class_competition(), end_class_competition(),
 * delete_class_competition(), join_class_competition() and leave_class_competition() in
 * supabase/migrations/…_classpoints2_02_class_competitions.sql.
 *
 * The database decides who sees what (Robert, 13 Nov 2026): the class sees a competition's name,
 * dates and criteria, and after the results one Winner card with pen names. Nothing in this file
 * carries a score, a total or another pupil's result, so no class screen can show one.
 */
import { numberFrom, objectFrom, type JsonObject } from '@/features/class-points/api/classPoints';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { competitionErrorFrom } from './competitionErrors';

/** One grading criterion: what the work must have (Robert, 13 Nov 2026, 19:20 UTC). */
export interface Criterion {
  /** The row's ID once saved; null in a form or a template. */
  id: string | null;
  label: string;
  maxPoints: number;
  description: string;
  outcomes: string[];
}

/** Where a competition stands. */
export type CompetitionPhase = 'upcoming' | 'open' | 'judging' | 'published';

/** The competition whose results aren't published yet, for the person looking. */
export interface RunningCompetition {
  id: string;
  name: string;
  /** Dates as YYYY-MM-DD. */
  startsOn: string;
  endsOn: string;
  phase: CompetitionPhase;
  criteria: Criterion[];
  /** A pupil: whether they joined. Always false for the teacher. */
  isEntrant: boolean;
  canJoin: boolean;
  canLeave: boolean;
  /** The teacher only: how many pupils joined. Null for a pupil. */
  entrantCount: number | null;
  canEdit: boolean;
  canEnd: boolean;
  canScore: boolean;
}

/** A result, as the certificates name it; 'participant' reads "Contestant". */
export type CompetitionResult = 'winner' | 'finalist' | 'participant';

/** The Winner card of a competition whose results are published. */
export interface WinnerCardData {
  id: string;
  name: string;
  publishedOn: string;
  /** The Winner's pen name; null below the 8th grade. */
  winner: string | null;
  winningChapter: {
    title: string;
    storyTitle: string;
    storySlug: string;
    chapterCode: string;
  } | null;
  /** Pen names, no numbers. */
  readersChoice: string[];
  /** The viewer's own result when they entered; never anyone else's. */
  myResult: CompetitionResult | null;
  isMyReadersChoice: boolean;
}

/** Competitions on a class page, for the person looking. */
export interface ClassCompetitions {
  role: 'teacher' | 'pupil';
  /** The class's school year, or null until the teacher sets it. */
  grade: number | null;
  /** False below the 8th grade: every entrant is a Contestant. */
  areWinnersAllowed: boolean;
  isArchived: boolean;
  /** Today as YYYY-MM-DD where class weeks are counted; the form's first day starts here. */
  today: string;
  running: RunningCompetition | null;
  published: WinnerCardData[];
}

/**
 * Reads a text.
 *
 * @param value - any JSON
 * @returns the text, or an empty text when it isn't one
 */
export function textOf(value: Json | undefined): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Reads a list.
 *
 * @param value - any JSON
 * @returns the list, or an empty one
 */
export function listOf(value: Json | undefined): Json[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Reads one criterion.
 *
 * @param value - {id, label, max_points, description, outcomes}
 * @returns the criterion
 */
export function criterionFrom(value: Json): Criterion {
  const entry = objectFrom(value) ?? {};
  return {
    id: typeof entry.id === 'string' ? entry.id : null,
    label: textOf(entry.label),
    maxPoints: numberFrom(entry.max_points),
    description: textOf(entry.description),
    outcomes: listOf(entry.outcomes).map(textOf),
  };
}

/**
 * Reads a phase.
 *
 * @param value - the database's word
 * @returns the phase; 'judging' for anything unknown, the state with no pupil actions
 */
function phaseFrom(value: Json | undefined): CompetitionPhase {
  if (value === 'upcoming' || value === 'open' || value === 'published') return value;
  return 'judging';
}

/**
 * Reads the running competition.
 *
 * @param value - class_competition_running_json()'s answer, or null
 * @returns the competition, or null when there is none
 */
function runningFrom(value: Json | undefined): RunningCompetition | null {
  const entry = objectFrom(value);
  if (entry === null) return null;
  return {
    id: textOf(entry.id),
    name: textOf(entry.name),
    startsOn: textOf(entry.starts_on),
    endsOn: textOf(entry.ends_on),
    phase: phaseFrom(entry.phase),
    criteria: listOf(entry.criteria).map(criterionFrom),
    isEntrant: entry.is_entrant === true,
    canJoin: entry.can_join === true,
    canLeave: entry.can_leave === true,
    entrantCount: typeof entry.entrant_count === 'number' ? entry.entrant_count : null,
    canEdit: entry.can_edit === true,
    canEnd: entry.can_end === true,
    canScore: entry.can_score === true,
  };
}

/**
 * Reads a result.
 *
 * @param value - the database's word
 * @returns the result, or null
 */
export function resultFrom(value: Json | undefined): CompetitionResult | null {
  if (value === 'winner' || value === 'finalist' || value === 'participant') return value;
  return null;
}

/**
 * Reads the winning chapter of a card.
 *
 * @param value - {title, story_title, story_slug, chapter_code}, or null
 * @returns the chapter, or null
 */
function winningChapterFrom(value: Json | undefined): WinnerCardData['winningChapter'] {
  const chapter = objectFrom(value);
  if (chapter === null) return null;
  return {
    title: textOf(chapter.title),
    storyTitle: textOf(chapter.story_title),
    storySlug: textOf(chapter.story_slug),
    chapterCode: textOf(chapter.chapter_code),
  };
}

/**
 * Reads one Winner card.
 *
 * @param value - class_competition_card_json()'s answer
 * @returns the card
 */
function cardFrom(value: Json): WinnerCardData {
  const entry = objectFrom(value) ?? {};
  return {
    id: textOf(entry.id),
    name: textOf(entry.name),
    publishedOn: textOf(entry.published_on),
    winner: typeof entry.winner === 'string' ? entry.winner : null,
    winningChapter: winningChapterFrom(entry.winning_chapter),
    readersChoice: listOf(entry.readers_choice).map(textOf),
    myResult: resultFrom(entry.my_result),
    isMyReadersChoice: entry.my_readers_choice === true,
  };
}

/**
 * Reads class_competitions()'s answer.
 *
 * @param value - the JSON the database returned
 * @returns the competitions, or null for someone outside the class
 */
export function classCompetitionsFrom(value: Json): ClassCompetitions | null {
  const answer: JsonObject | null = objectFrom(value);
  if (answer === null) return null;
  return {
    role: answer.role === 'teacher' ? 'teacher' : 'pupil',
    grade: typeof answer.grade === 'number' ? answer.grade : null,
    areWinnersAllowed: answer.winners_allowed === true,
    isArchived: answer.is_archived === true,
    today: textOf(answer.today),
    running: runningFrom(answer.running),
    published: listOf(answer.published).map(cardFrom),
  };
}

/**
 * Competitions on a class page.
 *
 * @param client - the signed-in Supabase client
 * @param slug - the class's address
 * @returns the competitions, or null for someone outside the class
 * @throws CompetitionError when the database can't be reached
 */
export async function fetchClassCompetitions(
  client: AppSupabaseClient,
  slug: string,
): Promise<ClassCompetitions | null> {
  const { data, error } = await client.rpc('class_competitions', { slug });
  if (error !== null) throw competitionErrorFrom(error);
  return classCompetitionsFrom(data);
}

/**
 * The teacher says which school year the class is.
 *
 * @param client - the signed-in Supabase client
 * @param request - the class's address and the school year, 1 to 13
 * @returns the competitions after the change
 * @throws CompetitionError: grade_range, grade_running, archived, not_allowed
 */
export async function setClassGrade(
  client: AppSupabaseClient,
  request: { slug: string; grade: number },
): Promise<ClassCompetitions | null> {
  const { data, error } = await client.rpc('set_class_grade', request);
  if (error !== null) throw competitionErrorFrom(error);
  return classCompetitionsFrom(data);
}

/** What the competition form sends. */
export interface CompetitionDetails {
  slug: string;
  /** The competition to change, or null for a new one. */
  competitionId: string | null;
  name: string;
  startsOn: string;
  endsOn: string;
  criteria: Criterion[];
}

/**
 * Criteria as the database takes them.
 *
 * @param criteria - the form's criteria
 * @returns [{label, max_points, description, outcomes}], empty outcome lines left out
 */
export function criteriaToJson(criteria: Criterion[]): Json {
  return criteria.map((criterion) => ({
    label: criterion.label,
    max_points: criterion.maxPoints,
    description: criterion.description,
    outcomes: criterion.outcomes.filter((outcome) => outcome.trim() !== ''),
  }));
}

/**
 * The teacher starts a competition, or changes one nobody joined.
 *
 * @param client - the signed-in Supabase client
 * @param details - the name, the dates and the criteria
 * @returns the competitions after the change
 * @throws CompetitionError: needs_grade, name, dates, exists, started or a criteria failure
 */
export async function saveClassCompetition(
  client: AppSupabaseClient,
  details: CompetitionDetails,
): Promise<ClassCompetitions | null> {
  const { data, error } = await client.rpc('save_class_competition', {
    slug: details.slug,
    details: {
      name: details.name,
      starts_on: details.startsOn,
      ends_on: details.endsOn,
      criteria: criteriaToJson(details.criteria),
    },
    target_competition_id: details.competitionId ?? undefined,
  });
  if (error !== null) throw competitionErrorFrom(error);
  return classCompetitionsFrom(data);
}

/** The four calls that take only a competition's ID. */
export type CompetitionAction = 'end' | 'delete' | 'join' | 'leave';

/** The database function behind each action. */
const functionFor = {
  end: 'end_class_competition',
  delete: 'delete_class_competition',
  join: 'join_class_competition',
  leave: 'leave_class_competition',
} as const;

/**
 * Ends or deletes a competition (the teacher), or joins or leaves it (a pupil).
 *
 * @param client - the signed-in Supabase client
 * @param request - what to do and the competition's ID
 * @returns the competitions after the change
 * @throws CompetitionError: missing, closed, not_open, published
 */
export async function actOnCompetition(
  client: AppSupabaseClient,
  request: { action: CompetitionAction; competitionId: string },
): Promise<ClassCompetitions | null> {
  const { data, error } = await client.rpc(functionFor[request.action], {
    target_competition_id: request.competitionId,
  });
  if (error !== null) throw competitionErrorFrom(error);
  return classCompetitionsFrom(data);
}
