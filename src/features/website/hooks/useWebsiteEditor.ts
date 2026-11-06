/**
 * useWebsiteEditor: one kind of website content in one market, for the staff editors (stories
 * S1-E11-06, S1-E11-10 and S1-E11-12).
 *
 * Who calls it: HomePageEditor, NoticeEditor and HelpEditor.
 * What it calls: the WebsiteContentStore (api/websiteContentStore.ts). After every change it reads
 * the versions again and drops the cached public content, so the admin sees the website as
 * visitors will. The last failure keeps the database's list of fields to fix.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { WebsiteContentKind } from '@/schemas/websiteContent';

import { appDatabaseStore } from '../api/staff/websiteContentEditor';
import { WebsiteContentError, type DraftInput, type EntryPlace } from '../api/websiteContentStore';

/** One editor action. */
export type EditorAction =
  | { kind: 'save'; draft: DraftInput }
  | { kind: 'publish'; draft: DraftInput }
  | { kind: 'restore'; versionId: string }
  | { kind: 'remove'; place: EntryPlace };

/** What the last action did, for the message under the buttons. */
export interface EditorOutcome {
  action: EditorAction['kind'];
  /** The go-live day after a publish. */
  goesLive: string | null;
}

/**
 * Carries out one action through the store.
 *
 * @param action - what to do
 * @returns the outcome
 */
async function runAction(action: EditorAction): Promise<EditorOutcome> {
  const store = appDatabaseStore(await requireClient());
  if (action.kind === 'save') {
    await store.saveDraft(action.draft);
    return { action: 'save', goesLive: null };
  }
  if (action.kind === 'publish') {
    // Publishing saves the fields first, so what goes live is exactly what the admin sees.
    const draftId = await store.saveDraft(action.draft);
    return { action: 'publish', goesLive: await store.publish(draftId) };
  }
  if (action.kind === 'restore') {
    await store.restore(action.versionId);
    return { action: 'restore', goesLive: null };
  }
  await store.remove(action.place);
  return { action: 'remove', goesLive: null };
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
 * Follows one kind in one market.
 *
 * @param kind - for example 'home_page'
 * @param marketCode - for example 'RO'
 * @returns versions, the load state, act() and the last action's outcome or failure
 */
export function useWebsiteEditor(kind: WebsiteContentKind, marketCode: string) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<EditorOutcome | null>(null);
  const versions = useQuery({
    queryKey: ['cms-versions', kind, marketCode],
    retry: false,
    queryFn: async () => appDatabaseStore(await requireClient()).listVersions(kind, marketCode),
  });
  const mutation = useMutation({
    mutationFn: runAction,
    onMutate: () => setOutcome(null),
    onSuccess: async (result) => {
      setOutcome(result);
      await queryClient.invalidateQueries({ queryKey: ['cms-versions', kind] });
      await queryClient.invalidateQueries({ queryKey: ['website-content'] });
    },
  });
  return {
    versions: versions.data ?? [],
    isLoading: versions.isPending,
    loadFailure: versions.isError ? asWebsiteError(versions.error) : null,
    /** Runs an action; resolves true when it worked (the failure is in `failure` otherwise). */
    act: (action: EditorAction) =>
      mutation.mutateAsync(action).then(
        () => true,
        () => false,
      ),
    isActing: mutation.isPending,
    failure: mutation.isError ? asWebsiteError(mutation.error) : null,
    outcome,
  };
}

/** What the hook gives, for the components that receive it. */
export type WebsiteEditorState = ReturnType<typeof useWebsiteEditor>;
