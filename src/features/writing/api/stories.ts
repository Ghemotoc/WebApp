/**
 * Reads and makes the signed-in writer's stories (story S1-E3-01).
 *
 * Who calls it: the hooks in src/features/writing/hooks/.
 * What it calls next: Supabase.
 * - Reading the form's choices: story_language_choices() (every language, open or coming) and
 *   the categories table (categories_select_public).
 * - Making a story: create_story() (supabase/migrations/…_s1_e3_01_stories.sql), which answers
 *   {outcome: 'ok', slug} or {outcome: 'not_active'} when the account may not write yet.
 * - Reading the writer's own stories: stories with their tags, category and live chapters,
 *   through stories_select_own, story_tags_select_own and chapters_select_own (a writer reads
 *   only their own rows), deleted stories included so "Recently deleted" can offer undo (S1-E3-05).
 * - Settings (S1-E3-05): update_my_story(), delete_my_story() and restore_my_story()
 *   (supabase/migrations/…_s1_e3_05_story_settings.sql), which answer with an outcome.
 * - The labels (S1-E3-06): create_story() and update_my_story() take a `labels` object
 *   (…_s1_e3_06_ratings_and_labels.sql, check_story_labels()).
 * Readers never read these tables: they go through get_story_page() and get_chapter()
 * (ADR 0004, S1-E3-05 and S1-E4-01a).
 */
import type { CoverColourKey, CoverDesignKey } from '@/components/covers/coverDesigns';
import type { Database } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  coverJsonFor,
  type AiDisclosure,
  type NewStoryInput,
  type StoryRating,
  type StorySettingsInput,
} from '@/schemas/story';

/** A category as the form shows it: its key (translated by the screen) and its order. */
export interface StoryCategory {
  slug: string;
  position: number;
}

/** What create_story() answers. */
export type CreateStoryResult = { outcome: 'ok'; slug: string } | { outcome: 'not_active' };

/** A chapter's status as stored (S1-E3-02a). */
export type ChapterStatus = Database['public']['Enums']['chapter_status'];

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
  /** An uploaded cover's path in the covers bucket; null for the other kinds (S1-E10-05). */
  coverTallPath: string | null;
  /** The drawn cover's design and colours; null for the other kinds. */
  drawnCover: { design: CoverDesignKey; background: CoverColourKey; accent: CoverColourKey } | null;
  firstPublishedAt: string | null;
  createdAt: string;
  /** Ongoing or Completed (S1-E3-05). */
  completionStatus: 'ongoing' | 'completed';
  commentsEnabled: boolean;
  /** When the writer deleted it; null for a live story. Undo is possible for 30 days (S1-E3-05). */
  deletedAt: string | null;
  /** The labels (S1-E3-06). */
  rating: StoryRating;
  isFanFiction: boolean;
  isParody: boolean;
  dealsWithAbuseOrCoercion: boolean;
  contentNote: string;
  aiDisclosure: AiDisclosure;
  /** When staff labelled it "AI-written, not disclosed"; null otherwise (Q24). */
  aiUndisclosedLabelledAt: string | null;
  /** The live chapters in order (S1-E3-02a): the card links to the latest one. */
  chapters: { code: string; position: number; status: ChapterStatus }[];
}

/** The labels as create_story() and update_my_story() take them (check_story_labels()). */
type StoryLabelsPayload = Pick<
  NewStoryInput,
  | 'rating'
  | 'isFanFiction'
  | 'isParody'
  | 'dealsWithAbuseOrCoercion'
  | 'contentNote'
  | 'aiDisclosure'
>;

/**
 * Turns the form's label answers into the JSON the database functions take.
 *
 * @param labels - the checked answers
 * @returns the labels object, snake_case as the SQL reads it
 */
function toLabelsJson(labels: StoryLabelsPayload) {
  return {
    rating: labels.rating,
    is_fan_fiction: labels.isFanFiction,
    is_parody: labels.isParody,
    deals_with_abuse_or_coercion: labels.dealsWithAbuseOrCoercion,
    content_note: labels.contentNote,
    ai_disclosure: labels.aiDisclosure,
  };
}

/** What the settings functions answer. */
export type SettingsOutcome = 'ok' | 'not_active' | 'not_found';

/** One language on the new story form: open ones can be chosen, the rest are "coming". */
export interface StoryLanguageChoice {
  code: string;
  isOpen: boolean;
}

/**
 * Reads every language with whether a story may be written in it yet (S1-E11-05, criterion 5).
 *
 * @param client - the shared Supabase client
 * @returns the languages, interface languages first, for example [{ code: 'en', isOpen: true }]
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchStoryLanguages(
  client: AppSupabaseClient,
): Promise<StoryLanguageChoice[]> {
  const { data, error } = await client.rpc('story_language_choices');
  if (error !== null) throw new Error(`Could not read the languages: ${error.message}`);
  return data.map((row) => ({ code: row.code, isOpen: row.is_open }));
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
    cover: coverJsonFor(input.cover),
    story_id: input.storyId,
    labels: toLabelsJson(input),
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
 * Reads the signed-in writer's own stories, newest first, deleted ones included (the screen
 * shows those under "Recently deleted" with undo).
 *
 * @param client - the shared Supabase client
 * @returns the stories with their tags and category
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchMyStories(client: AppSupabaseClient): Promise<MyStory[]> {
  const { data, error } = await client
    .from('stories')
    .select(
      'id, slug, title, blurb, language_code, cover_kind, cover_design, cover_background, cover_accent, cover_tall_path, first_published_at, created_at, completion_status, comments_enabled, deleted_at, rating, is_fan_fiction, is_parody, deals_with_abuse_or_coercion, content_note, ai_disclosure, ai_undisclosed_labelled_at, categories(slug), story_tags(tags(name)), chapters(code, position, status)',
    )
    // Only live chapters, in order; the deleted ones wait for the purge (S1-E3-04 shows undo).
    .is('chapters.deleted_at', null)
    .order('position', { referencedTable: 'chapters', ascending: true })
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
    coverTallPath: row.cover_kind === 'upload' ? row.cover_tall_path : null,
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
    completionStatus: row.completion_status,
    commentsEnabled: row.comments_enabled,
    deletedAt: row.deleted_at,
    rating: row.rating,
    isFanFiction: row.is_fan_fiction,
    isParody: row.is_parody,
    dealsWithAbuseOrCoercion: row.deals_with_abuse_or_coercion,
    contentNote: row.content_note,
    aiDisclosure: row.ai_disclosure,
    aiUndisclosedLabelledAt: row.ai_undisclosed_labelled_at,
    chapters: row.chapters.map((chapter) => ({
      code: chapter.code,
      position: chapter.position,
      status: chapter.status,
    })),
  }));
}

/**
 * Reads an outcome the settings functions answer.
 *
 * @param data - the function's JSON answer
 * @returns 'ok', 'not_active' or 'not_found'
 * Errors: throws on anything else.
 */
function toSettingsOutcome(data: unknown): SettingsOutcome {
  const outcome = (data as { outcome?: string } | null)?.outcome;
  if (outcome === 'ok' || outcome === 'not_active' || outcome === 'not_found') return outcome;
  throw new Error(`Unexpected answer from the story settings: ${JSON.stringify(data)}`);
}

/**
 * Saves the settings of the writer's own story (S1-E3-05).
 *
 * @param client - the shared Supabase client
 * @param slug - the story's public address
 * @param settings - the checked answers (src/schemas/story.ts)
 * @returns the outcome
 * Errors: throws when the database refuses the answers or can't be reached.
 */
export async function updateMyStory(
  client: AppSupabaseClient,
  slug: string,
  settings: StorySettingsInput,
): Promise<SettingsOutcome> {
  const { data, error } = await client.rpc('update_my_story', {
    story_slug: slug,
    changes: {
      title: settings.title,
      blurb: settings.blurb,
      language_code: settings.languageCode,
      category_slug: settings.categorySlug,
      tag_names: settings.tags,
      cover: coverJsonFor(settings.cover),
      completion_status: settings.completionStatus,
      comments_enabled: settings.commentsEnabled,
      labels: toLabelsJson(settings),
    },
  });
  if (error !== null) throw new Error(`Could not save the story settings: ${error.message}`);
  return toSettingsOutcome(data);
}

/**
 * Hides the writer's own story at once; it can be undone for 30 days (S1-E3-05).
 *
 * @param client - the shared Supabase client
 * @param slug - the story's public address
 * @returns the outcome
 * Errors: throws when the database can't be reached.
 */
export async function deleteMyStory(
  client: AppSupabaseClient,
  slug: string,
): Promise<SettingsOutcome> {
  const { data, error } = await client.rpc('delete_my_story', { story_slug: slug });
  if (error !== null) throw new Error(`Could not delete the story: ${error.message}`);
  return toSettingsOutcome(data);
}

/**
 * Undoes a deletion within 30 days (S1-E3-05).
 *
 * @param client - the shared Supabase client
 * @param slug - the story's public address
 * @returns the outcome; 'not_found' once the 30 days have passed
 * Errors: throws when the database can't be reached.
 */
export async function restoreMyStory(
  client: AppSupabaseClient,
  slug: string,
): Promise<SettingsOutcome> {
  const { data, error } = await client.rpc('restore_my_story', { story_slug: slug });
  if (error !== null) throw new Error(`Could not restore the story: ${error.message}`);
  return toSettingsOutcome(data);
}
