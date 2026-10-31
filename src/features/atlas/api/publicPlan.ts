/**
 * Reads what readers can see of a story's plan (stories S1-E17-33 and S1-E17-35; bundle ATLAS,
 * part i).
 *
 * Who calls it: hooks/usePublicPlan.ts (the story page's links and the readers' pages) and
 * api/readerView.ts (the writer's "Preview as a reader", which answers in the same shape).
 * What it calls next: Supabase (supabase/migrations/…_s1_e17_32_public_plan.sql):
 * get_public_story_plan(), which checks the story's own read rules (a readable chapter, the
 * rating, blocks, moderation) and leaves out everything the writer kept private; and Storage for
 * each passed character picture (the atlas_images_select_public policy).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import { pictureViewsFromJson } from '@/features/pictures/api/pictures';

import type { BibleSectionPreset } from './bible';
import type { CharacterRole, RelationshipKind, SheetKey, StoryCast } from './characters';
import { checkedAnswer } from './checkedAnswer';

/** The plan's areas a writer can make public, in the settings' order (S1-E17-32). */
export const planAreas = [
  'characters',
  'relationship_map',
  'family_tree',
  'bible',
  'timeline',
] as const;
export type PlanArea = (typeof planAreas)[number];

/** The chapter an item waits for, shown only in the writer's preview (S1-E17-35). */
export interface PlanGuard {
  code: string;
  position: number;
  title: string;
}

/** One world entry as readers see it. */
export interface PublicEntry {
  id: string;
  title: string;
  tags: string[];
  body: string;
  showFrom: PlanGuard | null;
}

/** One world section with its public entries. */
export interface PublicSection {
  id: string;
  /** One of the default sections, shown in the reader's language; null for the writer's own. */
  preset: BibleSectionPreset | null;
  name: string;
  entries: PublicEntry[];
}

/** One timeline event as readers see it. */
export interface PublicEvent {
  id: string;
  title: string;
  displayDate: string;
  description: string;
  showFrom: PlanGuard | null;
}

/** Everything readers see of one story's plan. */
export interface PublicPlan {
  storySlug: string;
  storyTitle: string;
  areas: PlanArea[];
  /** The characters in the same shape as the writer's cast, so the map and tree draw them. */
  cast: StoryCast;
  /** The chapter each character waits for, by character ID (preview only). */
  characterGuards: Record<string, PlanGuard | null>;
  sections: PublicSection[];
  events: PublicEvent[];
  /** The readable chapters, for [[Name]] links to a chapter. */
  chapters: { code: string; title: string }[];
}

/** The cache key of a story's public plan. */
export const publicPlanQueryKey = (userId: string | null, slug: string) => [
  'public-story-plan',
  userId,
  slug,
];

/** One character as the database answers it. */
interface PublicCharacterRow {
  id: string;
  name: string;
  role: CharacterRole;
  sheet: Partial<Record<SheetKey, string>>;
  custom_values: Record<string, string>;
  first_appearance: string | null;
  picture: Json | null;
  picture_alt: string;
  show_from: PlanGuard | null;
}

/** The answer of get_public_story_plan() and preview_story_plan(). */
export interface PublicPlanRow {
  story: { slug: string; title: string };
  areas: PlanArea[];
  characters: PublicCharacterRow[];
  fields: { id: string; name: string }[];
  relationships: {
    id: string;
    from: string;
    to: string;
    kind: RelationshipKind;
    custom_label: string;
  }[];
  sections: {
    id: string;
    preset: BibleSectionPreset | null;
    name: string;
    entries: (Omit<PublicEntry, 'showFrom'> & { show_from: PlanGuard | null })[];
  }[];
  events: {
    id: string;
    title: string;
    display_date: string;
    description: string;
    show_from: PlanGuard | null;
  }[];
  chapters: { code: string; title: string }[];
}

/**
 * Turns the database's characters into the writer's cast shape, with a signed address for each
 * picture readers may see.
 *
 * @returns the cast and each character's guard
 */
async function castFrom(
  client: AppSupabaseClient,
  row: PublicPlanRow,
): Promise<{ cast: StoryCast; guards: Record<string, PlanGuard | null> }> {
  // Step 1: every picture at once, keyed by the character's ID.
  const pictureMap: Record<string, Json | null> = {};
  for (const character of row.characters) pictureMap[character.id] = character.picture;
  const pictures = await pictureViewsFromJson(client, pictureMap);
  // Step 2: each character, and the guard it waits for (only the preview has one).
  const guards: Record<string, PlanGuard | null> = {};
  const characters = row.characters.map((character) => {
    guards[character.id] = character.show_from;
    return {
      id: character.id,
      name: character.name,
      role: character.role,
      sheet: character.sheet,
      customValues: character.custom_values,
      firstAppearance: character.first_appearance,
      picture: pictures[character.id] ?? null,
      pictureAlt: character.picture_alt,
    };
  });
  const cast: StoryCast = {
    // Readers never upload, so the picture folder isn't needed.
    storyId: '',
    storyTitle: row.story.title,
    characters,
    fields: row.fields.map((field) => ({ id: field.id, name: field.name, isHidden: false })),
    chapters: [],
    relationships: row.relationships.map((link) => ({
      id: link.id,
      fromId: link.from,
      toId: link.to,
      kind: link.kind,
      customLabel: link.custom_label,
      note: '',
    })),
  };
  return { cast, guards };
}

/**
 * Turns the database's answer into what the readers' pages draw.
 *
 * @param client - the shared Supabase client (for the pictures' signed addresses)
 * @param row - the answer of get_public_story_plan() or preview_story_plan()
 * @returns the public plan
 */
export async function publicPlanFrom(
  client: AppSupabaseClient,
  row: PublicPlanRow,
): Promise<PublicPlan> {
  const { cast, guards } = await castFrom(client, row);
  return {
    storySlug: row.story.slug,
    storyTitle: row.story.title,
    areas: row.areas,
    cast,
    characterGuards: guards,
    sections: row.sections.map((section) => ({
      id: section.id,
      preset: section.preset,
      name: section.name,
      entries: section.entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        tags: entry.tags,
        body: entry.body,
        showFrom: entry.show_from,
      })),
    })),
    events: row.events.map((event) => ({
      id: event.id,
      title: event.title,
      displayDate: event.display_date,
      description: event.description,
      showFrom: event.show_from,
    })),
    chapters: row.chapters,
  };
}

/**
 * Reads a story's public plan, as readers see it.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @returns the public plan, or null when the caller may not read the story
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchPublicPlan(
  client: AppSupabaseClient,
  slug: string,
): Promise<PublicPlan | null> {
  const answer = await client.rpc('get_public_story_plan', { story_slug: slug });
  const data = checkedAnswer(answer, 'read the public plan', ['ok', 'not_found']);
  if (data.outcome === 'not_found') return null;
  return publicPlanFrom(client, data as unknown as PublicPlanRow);
}
