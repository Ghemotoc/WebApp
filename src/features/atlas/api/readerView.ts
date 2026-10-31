/**
 * The writer's "What readers can see" settings for one story (stories S1-E17-32 and S1-E17-35;
 * bundle ATLAS, part i).
 *
 * Who calls it: hooks/usePlanVisibility.ts and hooks/usePlanPreview.ts.
 * What it calls next: Supabase (supabase/migrations/…_s1_e17_32_public_plan.sql):
 * - story_plan_visibility(): the areas, each item's "Keep private" and spoiler guard, each
 *   sheet's open parts and the chapters to pick a guard from;
 * - set_story_public_areas(), set_plan_item_privacy(), set_plan_item_show_from() and
 *   set_character_public_parts();
 * - preview_story_plan(): "Preview as a reader", in the same shape as readers' answer.
 * Only the writer reads or changes any of it.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { checkedAnswer } from './checkedAnswer';
import { publicPlanFrom, type PlanArea, type PublicPlan, type PublicPlanRow } from './publicPlan';

/** One item's own switches. */
export interface ItemVisibility {
  isPrivate: boolean;
  /** The code of the chapter readers must reach first, or null (S1-E17-35). */
  showFrom: string | null;
}

/** The groups of a character sheet readers can be shown (S1-E17-32); notes have their own. */
export const sheetParts = ['basics', 'look_and_voice', 'inside', 'in_the_story', 'notes'] as const;
export type SheetPart = (typeof sheetParts)[number];

/** Every switch of one story. */
export interface PlanVisibility {
  areas: PlanArea[];
  /** By item ID: characters, relationships, sections, entries and events. */
  items: Record<string, ItemVisibility>;
  /** By character ID: the open groups and the IDs of the open custom fields. */
  sheetParts: Record<string, string[]>;
  /** The story's chapters, to pick a guard from. */
  chapters: { code: string; position: number; title: string }[];
}

/** The cache key of a story's settings. */
export const planVisibilityQueryKey = (userId: string | null, slug: string) => [
  'plan-visibility',
  userId,
  slug,
];

/** The cache key of a story's preview. */
export const planPreviewQueryKey = (userId: string | null, slug: string) => [
  'plan-preview',
  userId,
  slug,
];

/** What story_plan_visibility() answers. */
interface VisibilityRow {
  areas: PlanArea[];
  items: Record<string, { is_private: boolean; show_from: string | null }>;
  sheet_parts: Record<string, string[]>;
  chapters: { code: string; position: number; title: string }[];
}

/**
 * Reads a story's switches.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @returns the switches, or null when it isn't the writer's story
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchPlanVisibility(
  client: AppSupabaseClient,
  slug: string,
): Promise<PlanVisibility | null> {
  const answer = await client.rpc('story_plan_visibility', { story_slug: slug });
  const data = checkedAnswer(answer, 'read your settings', ['ok', 'not_found']);
  if (data.outcome === 'not_found') return null;
  const row = data as unknown as VisibilityRow;
  const items: Record<string, ItemVisibility> = {};
  for (const [itemId, item] of Object.entries(row.items)) {
    items[itemId] = { isPrivate: item.is_private, showFrom: item.show_from };
  }
  return { areas: row.areas, items, sheetParts: row.sheet_parts, chapters: row.chapters };
}

/**
 * Turns the plan's areas on or off (S1-E17-32).
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @param areas - every area readers should see
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function savePublicAreas(
  client: AppSupabaseClient,
  slug: string,
  areas: PlanArea[],
): Promise<void> {
  const answer = await client.rpc('set_story_public_areas', { story_slug: slug, areas });
  checkedAnswer(answer, 'save what readers can see');
}

/**
 * "Keep private" on one item (S1-E17-32).
 *
 * @param client - the shared Supabase client
 * @param itemId - a character, relationship, section, entry or event
 * @param keepPrivate - true to keep it from readers
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function saveItemPrivacy(
  client: AppSupabaseClient,
  itemId: string,
  keepPrivate: boolean,
): Promise<void> {
  const answer = await client.rpc('set_plan_item_privacy', {
    item_id: itemId,
    keep_private: keepPrivate,
  });
  checkedAnswer(answer, 'save “Keep private”');
}

/**
 * The spoiler guard on one character, entry or event (S1-E17-35).
 *
 * @param client - the shared Supabase client
 * @param itemId - the item
 * @param chapterCode - the chapter readers must reach first, or '' to show it from the start
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function saveItemShowFrom(
  client: AppSupabaseClient,
  itemId: string,
  chapterCode: string,
): Promise<void> {
  const answer = await client.rpc('set_plan_item_show_from', {
    item_id: itemId,
    chapter_code: chapterCode,
  });
  checkedAnswer(answer, 'save the chapter');
}

/**
 * Which parts of one character's sheet readers see (S1-E17-32).
 *
 * @param client - the shared Supabase client
 * @param characterId - the character
 * @param parts - the open groups and custom field IDs
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function saveSheetParts(
  client: AppSupabaseClient,
  characterId: string,
  parts: string[],
): Promise<void> {
  const answer = await client.rpc('set_character_public_parts', {
    character_id: characterId,
    parts,
  });
  checkedAnswer(answer, 'save the sheet’s parts');
}

/**
 * "Preview as a reader" (S1-E17-32).
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @returns what readers see, with each guard marked, and whether the story is published yet; null
 *   when it isn't the writer's story
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchPlanPreview(
  client: AppSupabaseClient,
  slug: string,
): Promise<{ plan: PublicPlan; isPublished: boolean } | null> {
  const answer = await client.rpc('preview_story_plan', { story_slug: slug });
  const data = checkedAnswer(answer, 'preview your story', ['ok', 'not_found']);
  if (data.outcome === 'not_found') return null;
  const plan = await publicPlanFrom(client, data as unknown as PublicPlanRow);
  return { plan, isPublished: data.is_published === true };
}
