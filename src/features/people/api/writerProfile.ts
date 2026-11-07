/**
 * Reads a writer's public profile (story S1-E5-05; ADR 0004: readers reach people only through
 * functions).
 *
 * Who calls it: hooks/useWriterProfile.ts.
 * What it calls next: get_writer_profile(handle) (…_s1_e5_05_profiles_and_blocks.sql). It answers
 * nothing for an unknown username, a profile a moderator hid, or a person who blocks the reader,
 * and never the user ID, year of birth, age check, email or online status. Since S1-E13-01 it
 * also says whether the owner keeps the rest of their profile and their library from this reader.
 */
import type { LibraryAudience } from '@/features/privacy/api/privacy';
import type { CoverColourKey, CoverDesignKey } from '@/components/covers/coverDesigns';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { StoryRating } from '@/schemas/story';

/** One story on the profile's shelf. */
export interface ProfileStory {
  /** The story's ID (never the writer's), used only to draw the automatic cover (S1-E3-13). */
  id: string;
  slug: string;
  title: string;
  blurb: string;
  categorySlug: string;
  completionStatus: 'ongoing' | 'completed';
  rating: StoryRating;
  coverKind: 'automatic' | 'drawn' | 'upload';
  drawnCover: { design: CoverDesignKey; background: CoverColourKey; accent: CoverColourKey } | null;
  chapterCount: number;
  lastChapterPublishedAt: string | null;
}

/** What the profile page shows. */
export interface WriterProfile {
  handle: string;
  displayName: string;
  penName: string | null;
  /** Empty when the profile is limited for this reader (S1-E13-01). */
  bio: string;
  /** Null when the profile is limited for this reader (S1-E13-01). */
  joinedAt: string | null;
  /** The owner keeps the rest of their profile from this reader: no bio, no join month. */
  isLimited: boolean;
  /** The reader may see the owner's library shelf (S1-E13-01). */
  libraryOpen: boolean;
  /** The owner's library choice, on their own profile only; null for anyone else. */
  libraryAudience: LibraryAudience | null;
  isMe: boolean;
  /** The reader blocks this person: the page shows Unblock and no stories. */
  iBlocked: boolean;
  /** The writer holds the Teacher badge, shown as "Teacher" (S1-E2-11). */
  isTeacher: boolean;
  /** The writer joined while the waiting list was on, shown as "Founding member" (WAITLIST-1). */
  isFoundingMember: boolean;
  /**
   * Whether the signed-in visitor may start a chat with this person (S1-E9-03): null signed out
   * or on one's own profile. False never says why, so nobody learns an age from it.
   */
  canMessage: boolean | null;
  counts: { stories: number; chapters: number; reads: number };
  stories: ProfileStory[];
}

/** One story as get_writer_profile() answers it. */
interface ProfileStoryRow {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  category_slug: string;
  completion_status: 'ongoing' | 'completed';
  rating: StoryRating;
  cover: {
    kind: 'automatic' | 'drawn' | 'upload';
    design: string | null;
    background: string | null;
    accent: string | null;
  };
  chapter_count: number;
  last_chapter_published_at: string | null;
}

/** The whole answer, as JSON. */
interface WriterProfileRow {
  handle: string;
  display_name: string;
  pen_name: string | null;
  bio: string;
  joined_at: string | null;
  is_limited: boolean;
  library_open: boolean;
  library_audience: LibraryAudience | null;
  is_me: boolean;
  i_blocked: boolean;
  is_teacher: boolean;
  is_founding_member: boolean;
  can_message: boolean | null;
  counts: { stories: number; chapters: number; reads: number };
  stories: ProfileStoryRow[];
}

/**
 * The drawn cover's choice, when the writer drew one and every part is there.
 *
 * @param cover - the cover as stored
 * @returns the choice, or null for an automatic cover
 */
function drawnCoverOf(cover: ProfileStoryRow['cover']): ProfileStory['drawnCover'] {
  if (cover.kind !== 'drawn') return null;
  if (cover.design === null || cover.background === null || cover.accent === null) return null;
  return {
    design: cover.design as CoverDesignKey,
    background: cover.background as CoverColourKey,
    accent: cover.accent as CoverColourKey,
  };
}

/**
 * Turns one story row into the screen's shape.
 *
 * @param row - the story as the database answered it
 * @returns the story for the shelf
 */
function toProfileStory(row: ProfileStoryRow): ProfileStory {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    blurb: row.blurb,
    categorySlug: row.category_slug,
    completionStatus: row.completion_status,
    rating: row.rating,
    coverKind: row.cover.kind,
    drawnCover: drawnCoverOf(row.cover),
    chapterCount: row.chapter_count,
    lastChapterPublishedAt: row.last_chapter_published_at,
  };
}

/**
 * Reads the profile behind a username.
 *
 * @param client - the shared Supabase client
 * @param handle - the username from the address, with or without "@"
 * @returns the profile, or null when the reader may not see it
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchWriterProfile(
  client: AppSupabaseClient,
  handle: string,
): Promise<WriterProfile | null> {
  const { data, error } = await client.rpc('get_writer_profile', { wanted_handle: handle });
  if (error !== null) throw new Error(`Could not read the profile: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as WriterProfileRow;
  return {
    handle: row.handle,
    displayName: row.display_name,
    penName: row.pen_name,
    bio: row.bio,
    joinedAt: row.joined_at,
    isLimited: row.is_limited,
    libraryOpen: row.library_open,
    libraryAudience: row.library_audience,
    isMe: row.is_me,
    iBlocked: row.i_blocked,
    isTeacher: row.is_teacher,
    // An older database without the badge says nothing: no badge (WAITLIST-1).
    isFoundingMember: row.is_founding_member === true,
    canMessage: row.can_message,
    counts: row.counts,
    stories: row.stories.map(toProfileStory),
  };
}

/** The longest bio (story S1-E5-05's proposal; the database checks it too). */
export const bioMaxLength = 300;

/** Why saving the bio failed, in words the form can explain. */
export type BioFailure = 'read_only' | 'too_long' | 'unreachable';

/** The error a refused bio throws. */
export class BioError extends Error {
  constructor(public readonly failure: BioFailure) {
    super(`Saving the bio failed: ${failure}`);
  }
}

/**
 * Saves the signed-in person's bio.
 *
 * @param client - the shared Supabase client
 * @param bio - the new bio (the database trims it and fixes ş/ţ)
 * @returns the bio as saved
 * Errors: throws BioError: read_only (42501, the account gate), too_long (23514) or unreachable.
 */
export async function saveMyBio(client: AppSupabaseClient, bio: string): Promise<string> {
  const { data, error } = await client.rpc('set_my_bio', { new_bio: bio });
  if (error === null) return data;
  if (error.code === '42501') throw new BioError('read_only');
  if (error.code === '23514') throw new BioError('too_long');
  throw new BioError('unreachable');
}
