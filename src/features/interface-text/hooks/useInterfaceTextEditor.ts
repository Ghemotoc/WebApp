/**
 * useInterfaceTextEditor: every version of one interface text key, and the editor's actions
 * (stories S1-E11-18 and S1-E11-19).
 *
 * Who calls it: TextKeyEditor. What it calls: api/interfaceTextStore.ts. After every change it
 * reads the versions again. The last failure keeps the database's problem words for the fields.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { WebsiteContentError } from '@/features/website/api/websiteContentStore';

import {
  listTextVersions,
  publishText,
  resetText,
  restoreText,
  saveTextDraft,
  type TextDraft,
} from '../api/interfaceTextStore';

/** One editor action on one locale. */
export type TextAction =
  | { kind: 'save'; draft: TextDraft }
  | { kind: 'publish'; draft: TextDraft }
  | { kind: 'restore'; versionId: string; locale: string }
  | { kind: 'reset'; textKey: string; locale: string };

/** What the last action did, and in which locale. */
export interface TextOutcome {
  action: TextAction['kind'];
  locale: string;
  goesLive: string | null;
}

/**
 * The locale an action is about.
 *
 * @returns the locale code
 */
function localeOf(action: TextAction): string {
  return action.kind === 'save' || action.kind === 'publish' ? action.draft.locale : action.locale;
}

/**
 * Carries out one action.
 *
 * @param action - what to do
 * @returns the outcome
 */
async function runTextAction(action: TextAction): Promise<TextOutcome> {
  const client = await requireClient();
  const locale = localeOf(action);
  if (action.kind === 'save') {
    await saveTextDraft(client, action.draft);
    return { action: 'save', locale, goesLive: null };
  }
  if (action.kind === 'publish') {
    // Publishing saves first, so what goes live is exactly what the admin sees.
    const draftId = await saveTextDraft(client, action.draft);
    return { action: 'publish', locale, goesLive: await publishText(client, draftId) };
  }
  if (action.kind === 'restore') {
    await restoreText(client, action.versionId);
    return { action: 'restore', locale, goesLive: null };
  }
  await resetText(client, action.textKey, action.locale);
  return { action: 'reset', locale, goesLive: null };
}

/**
 * Turns anything thrown into the editors' error.
 *
 * @returns the error to show
 */
function asEditorError(error: unknown): WebsiteContentError {
  if (error instanceof WebsiteContentError) return error;
  return new WebsiteContentError('unreachable', String(error), [], null);
}

/**
 * Follows one key.
 *
 * @param textKey - "common:nav.help"
 * @returns the versions, the load state, act() and the last outcome or failure with its locale
 */
export function useInterfaceTextEditor(textKey: string) {
  const queryClient = useQueryClient();
  const [outcome, setOutcome] = useState<TextOutcome | null>(null);
  const [failedLocale, setFailedLocale] = useState<string | null>(null);
  const versions = useQuery({
    queryKey: ['interface-text-versions', textKey],
    retry: false,
    queryFn: async () => listTextVersions(await requireClient(), textKey),
  });
  const mutation = useMutation({
    mutationFn: runTextAction,
    onMutate: (action) => {
      setOutcome(null);
      setFailedLocale(localeOf(action));
    },
    onSuccess: async (result) => {
      setOutcome(result);
      await queryClient.invalidateQueries({ queryKey: ['interface-text-versions', textKey] });
    },
  });
  return {
    versions: versions.data ?? [],
    isLoading: versions.isPending,
    act: (action: TextAction) =>
      mutation.mutateAsync(action).then(
        () => true,
        () => false,
      ),
    isActing: mutation.isPending,
    failure: mutation.isError ? asEditorError(mutation.error) : null,
    failedLocale: mutation.isError ? failedLocale : null,
    outcome,
  };
}

/** What the hook gives, for the components that receive it. */
export type InterfaceTextEditorState = ReturnType<typeof useInterfaceTextEditor>;
