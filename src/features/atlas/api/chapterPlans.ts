/**
 * Reads and changes the planning beside each chapter (stories S1-E17-23 to S1-E17-26 and the
 * "Appears in" half of S1-E17-12; bundle ATLAS, part e).
 *
 * Who calls it: hooks/useChapterPlan.ts, hooks/useChapterProgress.ts and
 * hooks/useCharacterAppearances.ts.
 * What it calls next: Supabase (supabase/migrations/…_s1_e17_24_chapter_plans.sql):
 * - chapter_plan(): one chapter's planning, its scenes and the story's characters and acts;
 * - story_chapter_progress(): the story's chapters with words against each target;
 * - character_appearances(): the chapters a character is in;
 * - update_chapter_plan(), set_chapter_character_present() and the scene functions.
 * All of it is private: only the writer reads it (chapter_plans_select_own and the others).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { checkedAnswer } from './checkedAnswer';

/** S1-E17-24's chapter types. */
export const chapterKinds = ['chapter', 'prologue', 'interlude', 'epilogue'] as const;
export type ChapterKind = (typeof chapterKinds)[number];

/** Where a chapter or a scene is, from an idea to done (S1-E17-24, S1-E17-25). */
export const planningStatuses = ['idea', 'outlined', 'drafting', 'revising', 'done'] as const;
export type PlanningStatus = (typeof planningStatuses)[number];

/** The planning fields of one chapter. */
export interface ChapterPlanFields {
  kind: ChapterKind;
  planningStatus: PlanningStatus;
  /** The point-of-view character's ID, or null. */
  povCharacterId: string | null;
  /** True when the Narrator, outside the story, tells the chapter (G10c2); never with a character. */
  povIsNarrator: boolean;
  actId: string | null;
  /** Words aimed for in this chapter, or null for no target. */
  wordTarget: number | null;
  worldDate: string;
  worldSort: number | null;
  location: string;
  summary: string;
}

/** One scene inside a chapter (S1-E17-25). */
export interface ChapterScene {
  id: string;
  position: number;
  title: string;
  povCharacterId: string | null;
  status: PlanningStatus;
  summary: string;
}

/** Everything the planning panel shows for one chapter. */
export interface ChapterPlan {
  fields: ChapterPlanFields;
  /** The IDs of the characters marked present. */
  presentCharacterIds: string[];
  scenes: ChapterScene[];
  /** The story's characters, for the point-of-view pickers and the chips. */
  characters: { id: string; name: string }[];
  acts: { id: string; name: string; position: number }[];
}

/** One chapter in the writing view's list, with its words against its target (S1-E17-26). */
export interface ChapterProgress {
  code: string;
  position: number;
  title: string;
  status: string;
  kind: ChapterKind;
  wordCount: number;
  wordTarget: number | null;
}

/** One chapter a character appears in (S1-E17-12). */
export interface CharacterAppearance {
  code: string;
  position: number;
  title: string;
  isPov: boolean;
  isPresent: boolean;
}

/** The cache keys of the three readings. */
export const chapterPlanQueryKey = (userId: string | null, chapterCode: string) => [
  'chapter-plan',
  userId,
  chapterCode,
];
export const chapterProgressQueryKey = (userId: string | null, slug: string) => [
  'chapter-progress',
  userId,
  slug,
];
export const characterAppearancesQueryKey = (userId: string | null, characterId: string) => [
  'character-appearances',
  userId,
  characterId,
];

/** chapter_plan()'s answer, as the database writes it. */
interface ChapterPlanRow {
  plan: {
    kind: ChapterKind;
    planning_status: PlanningStatus;
    pov_character_id: string | null;
    pov_is_narrator: boolean;
    act_id: string | null;
    word_target: number | null;
    world_date: string;
    world_sort: number | null;
    location: string;
    summary: string;
  };
  present: string[];
  scenes: {
    id: string;
    position: number;
    title: string;
    pov_character_id: string | null;
    status: PlanningStatus;
    summary: string;
  }[];
  characters: { id: string; name: string }[];
  acts: { id: string; name: string; position: number }[];
}

/**
 * Reads the outcome of a reading and tells "not the writer's" apart from a real answer.
 *
 * @returns the answer's object, or null for not_found
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
function readingAnswer(
  answer: { data: unknown; error: { message: string } | null },
  action: string,
): Record<string, unknown> | null {
  if (answer.error !== null) throw new Error(`Could not ${action}: ${answer.error.message}`);
  const data = answer.data as Record<string, unknown> | null;
  if (data?.outcome === 'not_found') return null;
  if (data?.outcome !== 'ok') throw new Error(`Unexpected answer: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Reads one chapter's planning.
 *
 * @param client - the shared Supabase client
 * @param chapterCode - the chapter's code
 * @returns the plan, or null when the chapter isn't the writer's live chapter
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchChapterPlan(
  client: AppSupabaseClient,
  chapterCode: string,
): Promise<ChapterPlan | null> {
  const answer = await client.rpc('chapter_plan', { chapter_code: chapterCode });
  const data = readingAnswer(answer, 'read the chapter plan');
  if (data === null) return null;
  const row = data as unknown as ChapterPlanRow;
  return {
    fields: {
      kind: row.plan.kind,
      planningStatus: row.plan.planning_status,
      povCharacterId: row.plan.pov_character_id,
      povIsNarrator: row.plan.pov_is_narrator,
      actId: row.plan.act_id,
      wordTarget: row.plan.word_target,
      worldDate: row.plan.world_date,
      worldSort: row.plan.world_sort,
      location: row.plan.location,
      summary: row.plan.summary,
    },
    presentCharacterIds: row.present,
    scenes: row.scenes.map((scene) => ({
      id: scene.id,
      position: scene.position,
      title: scene.title,
      povCharacterId: scene.pov_character_id,
      status: scene.status,
      summary: scene.summary,
    })),
    characters: row.characters,
    acts: row.acts,
  };
}

/**
 * Reads the story's chapters with words against each target (S1-E17-23 and S1-E17-26).
 *
 * @returns the chapters in reading order, or null when the story isn't the writer's
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchChapterProgress(
  client: AppSupabaseClient,
  slug: string,
): Promise<ChapterProgress[] | null> {
  const answer = await client.rpc('story_chapter_progress', { story_slug: slug });
  const data = readingAnswer(answer, 'read the chapters');
  if (data === null) return null;
  const rows = data.chapters as {
    code: string;
    position: number;
    title: string;
    status: string;
    kind: ChapterKind;
    word_count: number;
    word_target: number | null;
  }[];
  return rows.map((row) => ({
    code: row.code,
    position: row.position,
    title: row.title,
    status: row.status,
    kind: row.kind,
    wordCount: row.word_count,
    wordTarget: row.word_target,
  }));
}

/**
 * Reads the chapters a character is the point of view of or present in (S1-E17-12).
 *
 * @returns the chapters in reading order, or null when the character isn't the writer's
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchCharacterAppearances(
  client: AppSupabaseClient,
  characterId: string,
): Promise<CharacterAppearance[] | null> {
  const answer = await client.rpc('character_appearances', { character_id: characterId });
  const data = readingAnswer(answer, 'read where the character appears');
  if (data === null) return null;
  const rows = data.chapters as {
    code: string;
    position: number;
    title: string;
    is_pov: boolean;
    is_present: boolean;
  }[];
  return rows.map((row) => ({
    code: row.code,
    position: row.position,
    title: row.title,
    isPov: row.is_pov,
    isPresent: row.is_present,
  }));
}

/** One change to a chapter's plan, keyed as the database names its fields. */
export interface ChapterPlanChange {
  kind?: ChapterKind;
  planning_status?: PlanningStatus;
  /** '' clears it. */
  pov_character_id?: string;
  /** True for the Narrator; the database then clears the character (G10c2). */
  pov_is_narrator?: boolean;
  /** '' clears it. */
  act_id?: string;
  /** null clears it. */
  word_target?: number | null;
  world_date?: string;
  world_sort?: number | null;
  location?: string;
  summary?: string;
}

/**
 * Saves one change to a chapter's plan (S1-E17-24: each field saves by itself).
 *
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function saveChapterPlanChange(
  client: AppSupabaseClient,
  chapterCode: string,
  change: ChapterPlanChange,
) {
  const answer = await client.rpc('update_chapter_plan', {
    chapter_code: chapterCode,
    changes: { ...change },
  });
  checkedAnswer(answer, 'save the chapter plan');
}

/**
 * Marks a character present in a chapter, or not (the toggle chips).
 *
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function setCharacterPresent(
  client: AppSupabaseClient,
  chapterCode: string,
  characterId: string,
  isPresent: boolean,
) {
  const answer = await client.rpc('set_chapter_character_present', {
    chapter_code: chapterCode,
    character_id: characterId,
    is_present: isPresent,
  });
  checkedAnswer(answer, 'change who is present');
}

/**
 * Adds a scene at the end of a chapter (S1-E17-25).
 *
 * Errors: throws when the title is empty, there are 100 scenes already, or the database can't
 *   be reached.
 */
export async function addChapterScene(
  client: AppSupabaseClient,
  chapterCode: string,
  title: string,
) {
  const answer = await client.rpc('add_chapter_scene', {
    chapter_code: chapterCode,
    scene_title: title,
  });
  checkedAnswer(answer, 'add the scene');
}

/** One change to a scene, keyed as the database names its fields. */
export interface ChapterSceneChange {
  title?: string;
  /** '' clears it. */
  pov_character_id?: string;
  status?: PlanningStatus;
  summary?: string;
}

/**
 * Saves one change to a scene (each field saves by itself).
 *
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function saveChapterSceneChange(
  client: AppSupabaseClient,
  sceneId: string,
  change: ChapterSceneChange,
) {
  const answer = await client.rpc('update_chapter_scene', {
    scene_id: sceneId,
    changes: { ...change },
  });
  checkedAnswer(answer, 'save the scene');
}

/**
 * Puts a scene at a new place (from 1) in its chapter, the others shifting (S1-E17-25).
 *
 * Errors: throws when the database can't be reached.
 */
export async function moveChapterScene(
  client: AppSupabaseClient,
  sceneId: string,
  newPosition: number,
) {
  const answer = await client.rpc('move_chapter_scene', {
    scene_id: sceneId,
    new_position: newPosition,
  });
  checkedAnswer(answer, 'move the scene');
}

/**
 * Deletes a scene (S1-E17-25; the screen asks twice first).
 *
 * Errors: throws when the database can't be reached or the scene isn't the writer's.
 */
export async function deleteChapterScene(client: AppSupabaseClient, sceneId: string) {
  const answer = await client.rpc('delete_chapter_scene', { scene_id: sceneId });
  checkedAnswer(answer, 'delete the scene');
}
