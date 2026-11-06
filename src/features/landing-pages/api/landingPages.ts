/**
 * The landing page store: the one way the app reads and writes landing pages (story S1-E11-14;
 * bundle CONTESTS-13a1).
 *
 * Who calls it: the public page /c/<slug> (hooks/usePublicLandingPage.ts) and the Remind me
 * button. Staff's calls are in api/staff/landingPagesAdmin.ts (QA-5), with the types they share
 * defined here.
 * What it calls next: landing_page() and set_landing_reminder(). Errors become a WebsiteContentError, so the editor shows the same field
 * list as the rest of the CMS. Part a2a: pictures become signed addresses here (only for pictures
 * the caller may see, pictures/api/pictures.ts) and Featured stories become story cards.
 */
import {
  type ListedStory,
  type ListedStoryRow,
  toListedStory,
} from '@/features/discovery/api/storyLists';
import { pictureViewsFromJson, type PictureView } from '@/features/pictures/api/pictures';
import { websiteErrorFrom } from '@/features/website/api/websiteContentStore';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  publicLandingPageSchema,
  landingReminderSchema,
  type LandingContent,
  type LandingPageType,
  type LandingReminder,
  type LandingResult,
  type PublicLandingPage,
} from '@/schemas/landingPages';

/**
 * What a page shows beside its words: the pictures by ID, each Featured block's stories by block
 * ID (null in the editor's preview, which has no published cards yet) and, from part a2b, the
 * Remind me state with the page's address (null in the preview, where nobody can tap it) and,
 * from contests part b2b, the contest's published results.
 */
export interface LandingExtras {
  pictures: Record<string, PictureView>;
  featured: Record<string, ListedStory[]> | null;
  reminder: { pageSlug: string; state: LandingReminder | null } | null;
  /** Contests part b2b: the published results; absent or null when there are none. */
  results?: LandingResult[] | null;
}

/** A page as a visitor gets it: the published version and its extras. */
export interface VisitorLandingPage {
  page: PublicLandingPage;
  extras: LandingExtras;
}

/** One page in the staff list. */
export interface StaffLandingPage {
  id: string;
  slug: string;
  pageType: LandingPageType;
  isArchived: boolean;
  createdAt: string;
}

/** One version of a page, for the editor and its history. */
export interface LandingPageVersion {
  id: string;
  pageId: string;
  status: 'draft' | 'published';
  content: LandingContent;
  showFrom: string | null;
  takeDownOn: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

/** What the editor saves as the draft. */
export interface LandingDraftInput {
  pageId: string;
  content: LandingContent;
  showFrom: string | null;
  takeDownOn: string | null;
}

/** An empty page's content: the plum theme and no blocks yet. */
export const emptyLandingContent: LandingContent = { theme: 'plum', blocks: [] };

/**
 * Turns each Featured block's rows from story_card_json() into story cards.
 *
 * @param featured - the rows by block ID
 * @returns the cards by block ID
 */
function featuredStoriesFrom(
  featured: PublicLandingPage['featured'],
): Record<string, ListedStory[]> {
  const stories: Record<string, ListedStory[]> = {};
  for (const [blockId, rows] of Object.entries(featured)) {
    stories[blockId] = rows.map((row) => toListedStory(row as unknown as ListedStoryRow));
  }
  return stories;
}

/**
 * Reads the public page at /c/<slug>, with its pictures' signed addresses and its story cards.
 *
 * @param client - the Supabase client (signed in or not)
 * @param slug - the address part after /c/
 * @returns the page, or null when there is none, it is archived or nothing is live yet
 * @throws WebsiteContentError when the server can't be reached
 */
export async function fetchPublicLandingPage(
  client: AppSupabaseClient,
  slug: string,
): Promise<VisitorLandingPage | null> {
  const { data, error } = await client.rpc('landing_page', { page_slug: slug });
  if (error) throw websiteErrorFrom(error);
  if (data === null) return null;
  // A page that doesn't parse is treated as missing rather than drawn half-broken.
  const parsed = publicLandingPageSchema.safeParse(data);
  if (!parsed.success) return null;
  const pictures = await pictureViewsFromJson(client, parsed.data.pictures as unknown as Json);
  return {
    page: parsed.data,
    extras: {
      pictures,
      featured: featuredStoriesFrom(parsed.data.featured),
      reminder: { pageSlug: parsed.data.slug, state: parsed.data.reminder },
      results: parsed.data.results,
    },
  };
}

/**
 * Asks for, or cancels, the one notification when a page's entries open (part a2b, criterion 8).
 *
 * @param client - the signed-in reader's Supabase client
 * @param slug - the page's address part after /c/
 * @param wanted - true to ask, false to cancel
 * @returns the Remind me state after the change
 * @throws WebsiteContentError (reason sign_in, no_reminder or already_open)
 */
export async function setLandingReminder(
  client: AppSupabaseClient,
  slug: string,
  wanted: boolean,
): Promise<LandingReminder> {
  const { data, error } = await client.rpc('set_landing_reminder', {
    page_slug: slug,
    wanted,
  });
  if (error) throw websiteErrorFrom(error);
  return landingReminderSchema.parse(data);
}
