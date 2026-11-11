/**
 * useLandingPageEditor and useLandingPageList: Staff › Website › Landing pages (story S1-E11-14;
 * bundle CONTESTS-13a1).
 *
 * Who calls them: LandingPagesTab (the list and "New page") and LandingPageEditor (one page).
 * What they call: api/landingPages.ts. After every change they read the pages and versions again
 * and drop the cached public page, so the admin sees /c/<slug> as visitors will. The last failure
 * keeps the database's list of fields to fix, in the same shape as the rest of the CMS.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { WebsiteContentError } from '@/features/website/api/websiteContentStore';
import type { LandingContent, LandingPageType } from '@/schemas/landingPages';

import {
  archiveLandingPage,
  copyLandingPage,
  createLandingPage,
  fetchLandingPageVersions,
  fetchStaffLandingPages,
  publishLandingDraft,
  restoreLandingVersion,
  saveLandingDraft,
} from '../api/staff/landingPagesAdmin';
import type { LandingDraftInput } from '../api/landingPages';

/** One editor action on a page. */
export type LandingEditorAction =
  | { kind: 'save'; draft: LandingDraftInput }
  | { kind: 'publish'; draft: LandingDraftInput }
  | { kind: 'restore'; versionId: string }
  | { kind: 'archive'; pageId: string };

/** What the last action did, for the message under the buttons. */
export interface LandingEditorOutcome {
  action: LandingEditorAction['kind'];
  /** The go-live day after a publish. */
  goesLive: string | null;
}

/**
 * Turns anything thrown into a WebsiteContentError.
 *
 * @param error - what was thrown
 * @returns the error to show
 */
function asWebsiteError(error: unknown): WebsiteContentError {
  if (error instanceof WebsiteContentError) return error;
  return new WebsiteContentError('unreachable', String(error), [], null);
}

/**
 * Carries out one action.
 *
 * @param action - what to do
 * @returns the outcome
 */
async function runAction(action: LandingEditorAction): Promise<LandingEditorOutcome> {
  const client = await requireClient();
  if (action.kind === 'save') {
    await saveLandingDraft(client, action.draft);
    return { action: 'save', goesLive: null };
  }
  if (action.kind === 'publish') {
    // Publishing saves the fields first, so what goes live is exactly what the admin sees.
    const draftId = await saveLandingDraft(client, action.draft);
    return { action: 'publish', goesLive: await publishLandingDraft(client, draftId) };
  }
  if (action.kind === 'restore') {
    await restoreLandingVersion(client, action.versionId);
    return { action: 'restore', goesLive: null };
  }
  await archiveLandingPage(client, action.pageId);
  return { action: 'archive', goesLive: null };
}

/** What "New landing page" sends: the address, the type and, when picked, a layout. */
export interface NewLandingPage {
  slug: string;
  pageType: LandingPageType;
  layout?: { name: string; content: LandingContent } | null;
}

/**
 * The staff list of pages, and starting a new one.
 *
 * @returns the pages, the load state, create() and its failure
 */
export function useLandingPageList() {
  const queryClient = useQueryClient();
  const pages = useQuery({
    queryKey: ['landing-pages'],
    retry: false,
    queryFn: async () => fetchStaffLandingPages(await requireClient()),
  });
  const creation = useMutation({
    mutationFn: async (page: NewLandingPage) =>
      createLandingPage(await requireClient(), page.slug, page.pageType, page.layout ?? null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['landing-pages'] }),
  });
  // Copy page (S1-E11-35): a new draft at its own address.
  const copying = useMutation({
    mutationFn: async (copy: { sourcePageId: string; slug: string }) =>
      copyLandingPage(await requireClient(), copy.sourcePageId, copy.slug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['landing-pages'] }),
  });
  return {
    pages: pages.data ?? [],
    isLoading: pages.isPending,
    loadFailure: pages.isError ? asWebsiteError(pages.error) : null,
    /** Starts a page; resolves to its id, or null when it was refused (see createFailure). */
    create: (page: NewLandingPage) =>
      creation.mutateAsync(page).then(
        (id) => id,
        () => null,
      ),
    isCreating: creation.isPending,
    createFailure: creation.isError ? asWebsiteError(creation.error) : null,
    /** Copies a page; resolves to the copy's id, or null when it was refused (see copyFailure). */
    copy: (copy: { sourcePageId: string; slug: string }) =>
      copying.mutateAsync(copy).then(
        (id) => id,
        () => null,
      ),
    isCopying: copying.isPending,
    copyFailure: copying.isError ? asWebsiteError(copying.error) : null,
  };
}

/**
 * One page's versions and the editor's actions.
 *
 * @param pageId - the page
 * @returns versions, the load state, act() and the last action's outcome or failure
 */
export function useLandingPageEditor(pageId: string) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<LandingEditorOutcome | null>(null);
  // Counts restores, so the form starts again from the restored words (its key changes).
  const [restoreCount, setRestoreCount] = useState(0);
  const versions = useQuery({
    queryKey: ['landing-page-versions', pageId],
    retry: false,
    queryFn: async () => fetchLandingPageVersions(await requireClient(), pageId),
  });
  const mutation = useMutation({
    mutationFn: runAction,
    onMutate: () => setOutcome(null),
    onSuccess: async (result) => {
      setOutcome(result);
      if (result.action === 'restore') setRestoreCount((count) => count + 1);
      await queryClient.invalidateQueries({ queryKey: ['landing-page-versions', pageId] });
      await queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      await queryClient.invalidateQueries({ queryKey: ['landing-page'] });
    },
  });
  return {
    versions: versions.data ?? [],
    isLoading: versions.isPending,
    loadFailure: versions.isError ? asWebsiteError(versions.error) : null,
    /** Runs an action; resolves true when it worked (the failure is in `failure` otherwise). */
    act: (action: LandingEditorAction) =>
      mutation.mutateAsync(action).then(
        () => true,
        () => false,
      ),
    isActing: mutation.isPending,
    failure: mutation.isError ? asWebsiteError(mutation.error) : null,
    outcome,
    restoreCount,
  };
}

/** What the editor hook gives, for the components that receive it. */
export type LandingEditorState = ReturnType<typeof useLandingPageEditor>;
