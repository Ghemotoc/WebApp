/**
 * The staff half of the landing page store: Staff › Website › Landing pages reads and writes
 * pages through here (story S1-E11-14; bundle CONTESTS-13a1). Split from ../landingPages.ts by
 * QA-5 (finding R5), so the public page /c/<slug> never downloads these calls.
 *
 * Who calls it: hooks/useLandingPageEditor.ts and hooks/useLandingPictures.ts (the editor).
 * What it calls next: the landing_pages and landing_page_versions tables (RLS lets only owner and
 * admin read them) and the admin_*_landing_page* functions in …_contests_a1_landing_pages.sql,
 * which check the role and write the audit log. Errors become a WebsiteContentError, so the
 * editor shows the same field list as the rest of the CMS.
 */
import { pictureViewsFromJson, type PictureView } from '@/features/pictures/api/pictures';
import { websiteErrorFrom } from '@/features/website/api/websiteContentStore';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  landingContentSchema,
  landingPageTypes,
  type LandingContent,
  type LandingPageType,
} from '@/schemas/landingPages';

import {
  emptyLandingContent,
  type LandingDraftInput,
  type LandingPageVersion,
  type StaffLandingPage,
} from '../landingPages';

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
 * Reads the check state of every picture uploaded for one page, for the editor (part a2a).
 *
 * @param client - the staff member's Supabase client
 * @param pageId - the page
 * @returns the pictures by ID, with a signed address where the staff member may see the file
 * @throws WebsiteContentError (not_allowed for anyone but owner and admin)
 */
export async function fetchLandingPictureStates(
  client: AppSupabaseClient,
  pageId: string,
): Promise<Record<string, PictureView>> {
  const { data, error } = await client.rpc('admin_landing_picture_states', {
    target_page_id: pageId,
  });
  if (error) throw websiteErrorFrom(error);
  return pictureViewsFromJson(client, data);
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
 * Starts a page with an empty draft, or with a ready-made layout's blocks (S1-E11-35).
 *
 * @param client - the staff member's Supabase client
 * @param slug - the address part after /c/
 * @param pageType - contest, campaign or information
 * @param layout - the layout's name and its starting content (lib/layouts.ts), or null
 * @returns the new page's id
 * @throws WebsiteContentError (reason bad_address, reserved, taken, bad_type, bad_layout or
 *   too_big)
 */
export async function createLandingPage(
  client: AppSupabaseClient,
  slug: string,
  pageType: LandingPageType,
  layout: { name: string; content: LandingContent } | null = null,
): Promise<string> {
  // A layout's blocks and starter words go in the same call, so the page never exists half-made.
  const { data, error } = await client.rpc('admin_create_landing_page', {
    new_slug: slug,
    new_page_type: pageType,
    starting_content: layout === null ? undefined : (layout.content as unknown as Json),
    layout_name: layout === null ? undefined : layout.name,
  });
  if (error) throw websiteErrorFrom(error);
  return data;
}

/**
 * Copies a page to a new address as a draft (S1-E11-35): the same type and the source's newest
 * words. Nothing goes live until the copy is published.
 *
 * @param client - the signed-in client
 * @param sourcePageId - the page to copy
 * @param slug - the copy's address
 * @returns the copy's id
 * @throws WebsiteContentError (not_allowed, not_found, or the address's problem)
 */
export async function copyLandingPage(
  client: AppSupabaseClient,
  sourcePageId: string,
  slug: string,
): Promise<string> {
  const { data, error } = await client.rpc('admin_copy_landing_page', {
    source_page_id: sourcePageId,
    new_slug: slug,
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
