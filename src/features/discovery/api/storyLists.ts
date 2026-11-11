/**
 * Story lists: the shelves on Discover and the See all, category and tag pages (stories S1-E5-01,
 * S1-E5-09, S1-E5-02).
 *
 * Who calls it: hooks/useStoryShelf.ts and hooks/useStoryList.ts.
 * What it calls next: browse_stories() (…_s1_e5_01_browse_stories.sql), which applies every
 * reader rule in the database: ratings (CLAUDE.md rule 18), blocks, moderation and drafts. It
 * answers the writer's username and display name, never a user ID.
 */
import type {
  CoverColourKey,
  CoverDesignKey,
  DrawnCoverChoice,
} from '@/components/covers/coverDesigns';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { StoryRating } from '@/schemas/story';
import type { WriterRank } from '@/features/forums/lib/writerRanks';

/** The lists the database knows (browse_stories()'s list_kind). */
export type ListKind =
  | 'updated'
  | 'new'
  | 'completed'
  | 'category'
  | 'tag'
  | 'following'
  | 'writer'
  | 'popular'
  | 'rising'
  | 'classics'
  | 'search'
  // S1-E4-03: one shelf of the reader's own library (the key is the shelf).
  | 'library'
  // S1-E2-06: stories that match what the reader said they like (signed in only).
  | 'picked'
  // S1-E13-01: someone's library, shown on their profile when they allow it (the key is the username).
  | 'reader_library'
  // IDEAS-1e: the stories shared most in the last 7 days.
  | 'shared'
  // GAPS-6: one reading list (the key is the list's ID); shown on its own page in the Library.
  | 'reading_list';

/**
 * The reader's sort choices (S1-E5-02; popular from S1-E5-03; relevance, only for search, from
 * S1-E5-04; this week's shares, only for "Most shared this week", from IDEAS-1e); null keeps the
 * list's own order.
 */
export type SortOrder =
  | 'relevance'
  | 'popular'
  | 'updated'
  | 'newest'
  | 'oldest'
  | 'title_az'
  | 'title_za'
  | 'writer'
  // IDEAS-1e: this week's shares, only on the 'shared' list.
  | 'shared';

/** Ongoing or completed: the status filter. */
export type CompletionStatus = 'ongoing' | 'completed';

/** Which list to read, with its filters. */
export interface ListRequest {
  kind: ListKind;
  /** The category slug, the tag, the username or the search term, for those kinds. */
  key: string | null;
  categorySlug: string | null;
  completion: CompletionStatus | null;
  /**
   * One language code; everyLanguage for no filter at all; or null, which means the languages the
   * reader reads on the lists that follow them (MARKETS-2c, readingLanguageKinds) and every
   * language on the others.
   */
  languageCode: string | null;
  sortOrder: SortOrder | null;
  /**
   * "Popular in" (MARKETS-2d), on the popular list only: a two-letter country code for that
   * country's ranking, everywhereRanking for the overall one, or null/absent when the page hasn't
   * picked yet (it then starts on the reader's own country, usePopularIn).
   */
  popularIn?: string | null;
}

/** "Popular in › Everywhere": the overall ranking (MARKETS-2d). */
export const everywhereRanking = 'everywhere';

/**
 * The country a list asks the database to rank by.
 *
 * @param request - the list
 * @returns a two-letter country code, or null for the overall ranking
 */
export function popularInFor(request: ListRequest): string | null {
  if (request.kind !== 'popular') return null;
  const country = request.popularIn ?? null;
  if (country === null || !/^[A-Z]{2}$/.test(country)) return null;
  return country;
}

/** The See all filter's "Every language": no language filter, even where reading languages apply. */
export const everyLanguage = 'any';

/**
 * The lists that follow the languages someone reads (MARKETS-2c; IDEA-20261109-2: "Discover,
 * Trending, genres and See all"). Personal lists (library, reading lists, someone's profile, the
 * writer's page, following) and search show every language, because the reader chose those
 * stories or asked for them by name. The public-domain classics shelf shows every language too:
 * it is a small curated shelf of Romanian and world classics, meant for every reader.
 */
const readingLanguageKinds: ReadonlySet<ListKind> = new Set<ListKind>([
  'updated',
  'new',
  'completed',
  'category',
  'tag',
  'popular',
  'rising',
  'picked',
  'shared',
]);

/**
 * Says whether a list follows the languages someone reads.
 *
 * @param kind - the list
 * @returns true for Discover's lists, Trending and the genre pages
 */
export function followsReadingLanguages(kind: ListKind): boolean {
  return readingLanguageKinds.has(kind);
}

/**
 * The language filter browse_stories() gets: one code, several separated by commas, or none.
 *
 * @param request - the list and its filters
 * @param readingLanguages - the languages the reader reads (useReadingLanguageFilter)
 * @returns the filter, or null for every language
 */
export function languageFilterFor(
  request: ListRequest,
  readingLanguages: readonly string[],
): string | null {
  // Step 1: a language picked in the filter wins; "Every language" turns the filter off.
  if (request.languageCode === everyLanguage) return null;
  if (request.languageCode !== null) return request.languageCode;
  // Step 2: otherwise the lists that follow them show the languages the reader reads.
  if (!followsReadingLanguages(request.kind) || readingLanguages.length === 0) return null;
  return readingLanguages.join(',');
}

/** One story as a card. */
export interface ListedStory {
  /** The story's ID (never the writer's), used only to draw the automatic cover (S1-E3-13). */
  id: string;
  slug: string;
  title: string;
  blurb: string;
  /** rank: the writer's rank for the card's pill, or null (IDEAS-3a; story_card_writer_rank()). */
  writer: { handle: string; displayName: string; rank: WriterRank | null };
  categorySlug: string;
  languageCode: string;
  completionStatus: CompletionStatus;
  rating: StoryRating;
  coverKind: 'automatic' | 'drawn' | 'upload';
  drawnCover: DrawnCoverChoice | null;
  chapterCount: number;
  lastChapterPublishedAt: string | null;
  /** The writer chose "In the app only" and it applies now: the card's label (GAPS-15, Q4). */
  appOnly: boolean;
}

/** One page of a list. */
export interface StoryListPage {
  /** How many stories the whole list holds for this reader. */
  total: number;
  stories: ListedStory[];
  /**
   * The country whose ranking ordered the list, or null for the overall ranking: a country with
   * too few ranked stories falls back to it, and the page says so (MARKETS-2d).
   */
  popularIn: string | null;
}

/** One story as browse_stories() answers it. */
export interface ListedStoryRow {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  writer: { handle: string; display_name: string; rank?: WriterRank | null };
  category_slug: string;
  language_code: string;
  completion_status: CompletionStatus;
  rating: StoryRating;
  cover: {
    kind: 'automatic' | 'drawn' | 'upload';
    design: string | null;
    background: string | null;
    accent: string | null;
  };
  chapter_count: number;
  last_chapter_published_at: string | null;
  /** GAPS-15 (story_card_json()); missing from functions that build their own cards. */
  app_only?: boolean;
}

/**
 * The drawn cover's choice, when the writer drew one and every part is there.
 *
 * @param cover - the cover as stored
 * @returns the choice, or null for an automatic cover
 */
function drawnCoverOf(cover: ListedStoryRow['cover']): DrawnCoverChoice | null {
  if (cover.kind !== 'drawn') return null;
  if (cover.design === null || cover.background === null || cover.accent === null) return null;
  return {
    design: cover.design as CoverDesignKey,
    background: cover.background as CoverColourKey,
    accent: cover.accent as CoverColourKey,
  };
}

/**
 * Turns one row into a ListedStory.
 *
 * @param row - the story as the database answered it
 * @returns the card's story
 */
export function toListedStory(row: ListedStoryRow): ListedStory {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    blurb: row.blurb,
    writer: {
      handle: row.writer.handle,
      displayName: row.writer.display_name,
      rank: row.writer.rank ?? null,
    },
    categorySlug: row.category_slug,
    languageCode: row.language_code,
    completionStatus: row.completion_status,
    rating: row.rating,
    coverKind: row.cover.kind,
    drawnCover: drawnCoverOf(row.cover),
    chapterCount: row.chapter_count,
    lastChapterPublishedAt: row.last_chapter_published_at,
    appOnly: row.app_only === true,
  };
}

/**
 * Reads one page of a list.
 *
 * @param client - the shared Supabase client
 * @param request - the list and its filters
 * @param page - how many stories (pageSize) from where (offset), and the languages the reader
 *   reads for the lists that follow them (MARKETS-2c)
 * @returns the page and the list's total
 * Errors: throws with Supabase's message when the database can't be reached or refuses the list.
 */
export async function fetchStoryList(
  client: AppSupabaseClient,
  request: ListRequest,
  page: { pageSize: number; offset: number; readingLanguages?: readonly string[] },
): Promise<StoryListPage> {
  // Step 1: only the filters that are set go to the database; the rest keep their defaults.
  const language = languageFilterFor(request, page.readingLanguages ?? []);
  const popularIn = popularInFor(request);
  const { data, error } = await client.rpc('browse_stories', {
    list_kind: request.kind,
    ...(request.key === null ? {} : { list_key: request.key }),
    ...(request.categorySlug === null ? {} : { category_slug: request.categorySlug }),
    ...(request.completion === null ? {} : { completion: request.completion }),
    ...(language === null ? {} : { language }),
    ...(request.sortOrder === null ? {} : { sort_order: request.sortOrder }),
    ...(popularIn === null ? {} : { popular_in: popularIn }),
    page_size: page.pageSize,
    page_offset: page.offset,
  });
  if (error !== null) throw new Error(`Could not read the stories: ${error.message}`);
  // Step 2: the screen's shape.
  const answer = data as unknown as {
    total: number;
    stories: ListedStoryRow[];
    popular_in?: string | null;
  };
  return {
    total: answer.total,
    stories: answer.stories.map(toListedStory),
    popularIn: answer.popular_in ?? null,
  };
}
