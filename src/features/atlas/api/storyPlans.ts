/**
 * Reads and changes one story's plan in Story Atlas (stories S1-E17-01 to S1-E17-06).
 *
 * Who calls it: the hooks in src/features/atlas/hooks/.
 * What it calls next: Supabase.
 * - story_plan(): the at-a-glance page: the story's title, category and rating, the plan's own
 *   fields, its acts, the chapter numbers and the cast count (supabase/migrations/…_s1_e17_01_story_plans.sql).
 * - update_story_plan(): the plan's own fields, one change at a time (S1-E17-03, S1-E17-04).
 * - update_my_story() (S1-E3-05): the title, genre and audience, which are the story's own, so a
 *   change in Story Atlas is the same change as in Story settings (S1-E17-03).
 * A plan is private: only its writer can read it (story_plans_select_own).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { StoryRating } from '@/schemas/story';

/** Where the writer is with the story (S1-E17-03). */
export const writingStatuses = [
  'planning',
  'drafting',
  'revising',
  'editing',
  'finished',
  'on_hold',
] as const;
export type WritingStatus = (typeof writingStatuses)[number];

/** How the writer means to publish it (S1-E17-06). */
export const publishingRoutes = [
  'undecided',
  'serial_here',
  'complete_here',
  'here_and_elsewhere',
] as const;
export type PublishingRoute = (typeof publishingRoutes)[number];

/** The plan's own fields, as the page shows and changes them. */
export interface PlanFields {
  logline: string;
  seriesName: string;
  wordTarget: number;
  writingStatus: WritingStatus;
  publishingRoute: PublishingRoute;
  linkedProjectLabel: string;
  linkedProjectUrl: string;
}

/** One of the chapters edited most recently. */
export interface RecentChapter {
  code: string;
  position: number;
  title: string;
  editedAt: string;
}

/** Everything the at-a-glance page shows. */
export interface StoryPlanPage {
  story: { slug: string; title: string; categorySlug: string; rating: StoryRating };
  plan: PlanFields;
  acts: { position: number; name: string }[];
  chapters: {
    wordsWritten: number;
    chapterCount: number;
    publishedCount: number;
    recent: RecentChapter[];
  };
  /** How many characters, and the three edited last (S1-E17-06, S1-E17-08). */
  cast: { count: number; recent: { id: string; name: string }[] };
}

/** The cache key of one story's plan. */
export const storyPlanQueryKey = (userId: string | null, slug: string) => [
  'story-plan',
  userId,
  slug,
];

/** The plan's fields as story_plan() answers them. */
interface PlanRow {
  logline: string;
  series_name: string;
  word_target: number;
  writing_status: WritingStatus;
  publishing_route: PublishingRoute;
  linked_project_label: string;
  linked_project_url: string;
}

/** What story_plan() answers for one of the caller's stories. */
interface StoryPlanRow {
  outcome: 'ok';
  story: { slug: string; title: string; category_slug: string; rating: StoryRating };
  plan: PlanRow;
  acts: { position: number; name: string }[];
  chapters: {
    words_written: number;
    chapter_count: number;
    published_count: number;
    recent: { code: string; position: number; title: string; edited_at: string }[];
  };
  cast: { count: number; recent: { id: string; name: string }[] };
}

/** The database's plan fields in the page's own names. */
function toPlanFields(row: PlanRow): PlanFields {
  return {
    logline: row.logline,
    seriesName: row.series_name,
    wordTarget: row.word_target,
    writingStatus: row.writing_status,
    publishingRoute: row.publishing_route,
    linkedProjectLabel: row.linked_project_label,
    linkedProjectUrl: row.linked_project_url,
  };
}

/** story_plan()'s answer in the page's own names. */
function toStoryPlanPage(row: StoryPlanRow): StoryPlanPage {
  return {
    story: {
      slug: row.story.slug,
      title: row.story.title,
      categorySlug: row.story.category_slug,
      rating: row.story.rating,
    },
    plan: toPlanFields(row.plan),
    acts: row.acts,
    chapters: {
      wordsWritten: row.chapters.words_written,
      chapterCount: row.chapters.chapter_count,
      publishedCount: row.chapters.published_count,
      recent: row.chapters.recent.map((chapter) => ({
        code: chapter.code,
        position: chapter.position,
        title: chapter.title,
        editedAt: chapter.edited_at,
      })),
    },
    cast: {
      count: row.cast.count,
      recent: row.cast.recent.map((character) => ({ id: character.id, name: character.name })),
    },
  };
}

/**
 * Reads one of the writer's story plans.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @returns the page, or null when it isn't the writer's live story
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchStoryPlan(
  client: AppSupabaseClient,
  slug: string,
): Promise<StoryPlanPage | null> {
  const { data, error } = await client.rpc('story_plan', { story_slug: slug });
  if (error !== null) throw new Error(`Could not read the story plan: ${error.message}`);
  const answer = data as { outcome?: string } | null;
  if (answer?.outcome === 'not_found') return null;
  if (answer?.outcome !== 'ok') {
    throw new Error(`Unexpected answer from story_plan: ${JSON.stringify(data)}`);
  }
  return toStoryPlanPage(answer as StoryPlanRow);
}

/** The database names of the plan's own fields. */
const planColumnNames: Record<keyof PlanFields, keyof PlanRow> = {
  logline: 'logline',
  seriesName: 'series_name',
  wordTarget: 'word_target',
  writingStatus: 'writing_status',
  publishingRoute: 'publishing_route',
  linkedProjectLabel: 'linked_project_label',
  linkedProjectUrl: 'linked_project_url',
};

/**
 * Saves one of the plan's own fields (each field saves by itself, S1-E17 principles).
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @param field - which field
 * @param value - its new value
 * Errors: throws when the database refuses the value (out of range, not a web address) or can't
 *   be reached, or when the story isn't the writer's.
 */
export async function savePlanField<Field extends keyof PlanFields>(
  client: AppSupabaseClient,
  slug: string,
  field: Field,
  value: PlanFields[Field],
): Promise<void> {
  const { data, error } = await client.rpc('update_story_plan', {
    story_slug: slug,
    changes: { [planColumnNames[field]]: value },
  });
  if (error !== null) throw new Error(`Could not save the plan: ${error.message}`);
  const outcome = (data as { outcome?: string } | null)?.outcome;
  if (outcome !== 'ok') throw new Error(`The plan was not saved: ${String(outcome)}`);
}

/** The story's own fields Story Atlas changes (S1-E17-03). */
export type StoryField = 'title' | 'categorySlug' | 'rating';

/** What update_my_story() takes for each of them. */
function storyChangesFor(field: StoryField, value: string): Json {
  if (field === 'title') return { title: value };
  if (field === 'categorySlug') return { category_slug: value };
  return { labels: { rating: value } };
}

/**
 * Saves the story's title, genre or audience, the same change as in Story settings (S1-E17-03).
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @param field - title, categorySlug or rating
 * @param value - its new value
 * Errors: throws when the database refuses it (an empty title, a rating its labels don't allow)
 *   or when the account may not change stories right now.
 */
export async function saveStoryField(
  client: AppSupabaseClient,
  slug: string,
  field: StoryField,
  value: string,
): Promise<void> {
  const { data, error } = await client.rpc('update_my_story', {
    story_slug: slug,
    changes: storyChangesFor(field, value),
  });
  if (error !== null) throw new Error(`Could not save the story: ${error.message}`);
  const outcome = (data as { outcome?: string } | null)?.outcome;
  if (outcome !== 'ok') throw new Error(`The story was not saved: ${String(outcome)}`);
}
