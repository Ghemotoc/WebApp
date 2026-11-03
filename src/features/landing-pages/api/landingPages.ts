/**
 * The landing page store: the one way the app reads and writes landing pages (story S1-E11-14;
 * bundle CONTESTS-13a1).
 *
 * Who calls it: the public page /c/<slug> (hooks/usePublicLandingPage.ts) and Staff › Website ›
 * Landing pages (hooks/useLandingPageEditor.ts).
 * What it calls next: landing_page() for visitors; for staff, the landing_pages and
 * landing_page_versions tables (RLS lets only owner and admin read them) and the
 * admin_*_landing_page* functions in …_contests_a1_landing_pages.sql, which check the role and
 * write the audit log. Errors become a WebsiteContentError, so the editor shows the same field
 * list as the rest of the CMS.
 */
import { websiteErrorFrom } from '@/features/website/api/websiteContentStore';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  landingContentSchema,
  landingPageTypes,
  publicLandingPageSchema,
  type LandingContent,
  type LandingPageType,
  type PublicLandingPage,
} from '@/schemas/landingPages';

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
 * Reads one version's content, or an empty page when it was saved before a field existed.
 *
 * @param content - the stored JSON
 * @returns the content
 */
function contentFrom(content: Json): LandingContent {
  const parsed = landingContentSchema.safeParse(content);
  return parsed.success ? parsed.data : emptyLandingContent;
}

/**
 * Reads the public page at /c/<slug>.
 *
 * @param client - the Supabase client (signed in or not)
 * @param slug - the address part after /c/
 * @returns the page, or null when there is none, it is archived or nothing is live yet
 * @throws WebsiteContentError when the server can't be reached
 */
export async function fetchPublicLandingPage(
  client: AppSupabaseClient,
  slug: string,
): Promise<PublicLandingPage | null> {
  const { data, error } = await client.rpc('landing_page', { page_slug: slug });
  if (error) throw websiteErrorFrom(error);
  if (data === null) return null;
  // A page that doesn't parse is treated as missing rather than drawn half-broken.
  const parsed = publicLandingPageSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/**
 * Reads every landing page for staff, newest first.
 *
 * @param client - the staff member's Supabase client
 * @returns the pages
 * @throws WebsiteContentError (not_allowed for anyone but owner and admin, through RLS)
 */
export async function fetchStaffLandingPages(
  client: AppSupabaseClient,
): Promise<StaffLandingPage[]> {
  const { data, error } = await client
    .from('landing_pages')
    .select('id, slug, page_type, archived_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw websiteErrorFrom(error);
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    pageType: landingPageTypes.find((type) => type === row.page_type) ?? 'information',
    isArchived: row.archived_at !== null,
    createdAt: row.created_at,
  }));
}

/**
 * Reads every version of one page, the draft first and then the newest published.
 *
 * @param client - the staff member's Supabase client
 * @param pageId - the page
 * @returns the versions
 * @throws WebsiteContentError
 */
export async function fetchLandingPageVersions(
  client: AppSupabaseClient,
  pageId: string,
): Promise<LandingPageVersion[]> {
  const { data, error } = await client
    .from('landing_page_versions')
    .select('id, page_id, status, content, show_from, take_down_on, published_at, updated_at')
    .eq('page_id', pageId)
    .order('published_at', { ascending: false, nullsFirst: true });
  if (error) throw websiteErrorFrom(error);
  return data.map((row) => ({
    id: row.id,
    pageId: row.page_id,
    status: row.status === 'published' ? 'published' : 'draft',
    content: contentFrom(row.content),
    showFrom: row.show_from,
    takeDownOn: row.take_down_on,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Starts a page with an empty draft.
 *
 * @param client - the staff member's Supabase client
 * @param slug - the address part after /c/
 * @param pageType - contest, campaign or information
 * @returns the new page's id
 * @throws WebsiteContentError (reason bad_address, reserved, taken or bad_type)
 */
export async function createLandingPage(
  client: AppSupabaseClient,
  slug: string,
  pageType: LandingPageType,
): Promise<string> {
  const { data, error } = await client.rpc('admin_create_landing_page', {
    new_slug: slug,
    new_page_type: pageType,
  });
  if (error) throw websiteErrorFrom(error);
  return data;
}

/**
 * Saves the editor's work as the page's draft.
 *
 * @param client - the staff member's Supabase client
 * @param draft - the page, its content and dates
 * @returns the draft's id
 * @throws WebsiteContentError
 */
export async function saveLandingDraft(
  client: AppSupabaseClient,
  draft: LandingDraftInput,
): Promise<string> {
  const { data, error } = await client.rpc('admin_save_landing_page_draft', {
    target_page_id: draft.pageId,
    new_content: draft.content as unknown as Json,
    new_show_from: draft.showFrom ?? undefined,
    new_take_down_on: draft.takeDownOn ?? undefined,
  });
  if (error) throw websiteErrorFrom(error);
  return data;
}

/**
 * Publishes a draft from its "show from" date.
 *
 * @param client - the staff member's Supabase client
 * @param versionId - the draft
 * @returns the day it goes live (YYYY-MM-DD)
 * @throws WebsiteContentError with the fields to fix
 */
export async function publishLandingDraft(
  client: AppSupabaseClient,
  versionId: string,
): Promise<string> {
  const { data, error } = await client.rpc('admin_publish_landing_page', { version_id: versionId });
  if (error) throw websiteErrorFrom(error);
  return data;
}

/**
 * Brings an earlier version back as the draft.
 *
 * @param client - the staff member's Supabase client
 * @param versionId - a published version
 * @returns the draft's id
 * @throws WebsiteContentError
 */
export async function restoreLandingVersion(
  client: AppSupabaseClient,
  versionId: string,
): Promise<string> {
  const { data, error } = await client.rpc('admin_restore_landing_page_version', {
    version_id: versionId,
  });
  if (error) throw websiteErrorFrom(error);
  return data;
}

/**
 * Takes a page's address down for good.
 *
 * @param client - the staff member's Supabase client
 * @param pageId - the page
 * @throws WebsiteContentError
 */
export async function archiveLandingPage(client: AppSupabaseClient, pageId: string): Promise<void> {
  const { error } = await client.rpc('admin_archive_landing_page', { target_page_id: pageId });
  if (error) throw websiteErrorFrom(error);
}
