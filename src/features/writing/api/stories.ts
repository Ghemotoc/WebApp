/**
 * Reads and makes the signed-in writer's stories (story S1-E3-01).
 *
 * Who calls it: the hooks in src/features/writing/hooks/.
 * What it calls next: Supabase.
 * - Reading the form's choices: open_story_languages() (the languages of the open markets) and
 *   the categories table (categories_select_public).
 * - Making a story: create_story() (supabase/migrations/…_s1_e3_01_stories.sql), which answers
 *   {outcome: 'ok', slug} or {outcome: 'not_active'} when the account may not write yet.
 * - Reading the writer's own stories: stories with their tags and category, through
 *   stories_select_own and story_tags_select_own (a writer reads only their own rows).
 * Readers never read these tables: they go through get_story_page() and get_chapter()
 * (ADR 0004, S1-E3-05 and S1-E4-01a).
 */
import type { CoverColourKey, CoverDesignKey } from '@/components/covers/coverDesigns';
import type { Database } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { NewStoryInput } from '@/schemas/story';

/** A category as the form shows it: its key (translated by the screen) and its order. */
export interface StoryCategory {
  slug: string;
  position: number;
}

/** What create_story() answers. */
export type CreateStoryResult = { outcome: 'ok'; slug: string } | { outcome: 'not_active' };

/** The cover kind as stored (automatic, drawn or upload). */
export type StoredCoverKind = Database['public']['Enums']['cover_kind'];

/** One of the writer's own stories, as the Your writing page lists it. */
export interface MyStory {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  languageCode: string;
  categorySlug: string;
  tags: string[];
  coverKind: StoredCoverKind;
  /** The drawn cover's design and colours; null for the other kinds. */
  drawnCover: { design: CoverDesignKey; background: CoverColourKey; accent: CoverColourKey } | null;
  firstPublishedAt: string | null;
  createdAt: string;
}

/**
 * Reads the languages a story may be written in.
 *
 * @param client - the shared Supabase client
 * @returns the BCP 47 codes of the open markets' languages, for example ['en', 'ro']
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchOpenLanguages(client: AppSupabaseClient): Promise<string[]> {
  const { data, error } = await client.rpc('open_story_languages');
  if (error !== null) throw new Error(`Could not read the open languages: ${error.message}`);
  return data;
}

/**
 * Reads the story categories in the order the form shows them.
 *
 * @param client - the shared Supabase client
 * @returns the categories
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchCategories(client: AppSupabaseClient): Promise<StoryCategory[]> {
  const { data, error } = await client
    .from('categories')
    .select('slug, position')
    .order('position');
  if (error !== null) throw new Error(`Could not read the categories: ${error.message}`);
  return data;
}

/**
 * Makes a story for the signed-in writer.
 *
 * @param client - the shared Supabase client
 * @param input - the checked form answers (src/schemas/story.ts)
 * @returns the new story's public address, or 'not_active' when the account may not write yet
 * Errors: throws when the database refuses the answers (a mistake the form should have caught)
 *   or can't be reached.
 */
export async function createStory(
  client: AppSupabaseClient,
  input: NewStoryInput,
): Promise<CreateStoryResult> {
  const { data, error } = await client.rpc('create_story', {
    title: input.title,
    blurb: input.blurb,
    language_code: input.languageCode,
    category_slug: input.categorySlug,
    tag_names: input.tags,
    cover: input.cover,
  });
  if (error !== null) throw new Error(`Could not create the story: ${error.message}`);
  // The function answers JSON; read it back into the two shapes the screen knows.
  const answer = data as { outcome?: string; slug?: string } | null;
  if (answer?.outcome === 'ok' && typeof answer.slug === 'string') {
    return { outcome: 'ok', slug: answer.slug };
  }
  if (answer?.outcome === 'not_active') return { outcome: 'not_active' };
  throw new Error(`Unexpected answer from create_story: ${JSON.stringify(answer)}`);
}

/**
 * Reads the signed-in writer's own stories, newest first, live ones only.
 *
 * @param client - the shared Supabase client
 * @returns the stories with their tags and category
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchMyStories(client: AppSupabaseClient): Promise<MyStory[]> {
  const { data, error } = await client
    .from('stories')
    .select(
      'id, slug, title, blurb, language_code, cover_kind, cover_design, cover_background, cover_accent, first_published_at, created_at, categories(slug), story_tags(tags(name))',
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error !== null) throw new Error(`Could not read your stories: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    blurb: row.blurb,
    languageCode: row.language_code,
    categorySlug: row.categories.slug,
    tags: row.story_tags.map((link) => link.tags.name),
    coverKind: row.cover_kind,
    drawnCover:
      row.cover_kind === 'drawn' &&
      row.cover_design !== null &&
      row.cover_background !== null &&
      row.cover_accent !== null
        ? {
            design: row.cover_design as CoverDesignKey,
            background: row.cover_background as CoverColourKey,
            accent: row.cover_accent as CoverColourKey,
          }
        : null,
    firstPublishedAt: row.first_published_at,
    createdAt: row.created_at,
  }));
}
