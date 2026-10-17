/**
 * useLegalAcceptance: which documents the signed-in person must accept, and accepting them
 * (story S1-E14-01: "signed-in users see a notice and must accept before posting again").
 *
 * Who calls it: LegalUpdateNotice (src/features/legal/components/), shown on every page.
 * What it calls: api/legalDocuments.ts (my_legal_documents_to_accept() and
 * accept_current_legal_versions()), and useSession to know whether someone is signed in.
 * Signed out, it never asks the database and the list is empty.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient, type AppSupabaseClient } from '@/lib/supabase';

import {
  acceptDocuments,
  fetchDocumentsToAccept,
  type DocumentToAccept,
} from '../api/legalDocuments';

/** The cache key of the signed-in person's waiting documents. */
const documentsToAcceptKey = (userId: string | null) => ['legal-documents-to-accept', userId];

/**
 * Gets the shared client, or fails in plain words when the app has no database settings.
 *
 * @returns the client
 */
async function requireClient(): Promise<AppSupabaseClient> {
  const client = await getSupabaseClient();
  if (client === null) throw new Error('The app is not connected to its database.');
  return client;
}

/**
 * Follows the signed-in person's waiting documents and offers a way to accept them.
 *
 * @returns documentsToAccept (empty when nothing waits or nobody is signed in), accept() and
 *   the accept call's state (isAccepting, acceptFailed)
 */
export function useLegalAcceptance() {
  const { userId } = useSession();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();

  // Step 1: ask only when someone is signed in; each person has their own cache entry.
  const waiting = useQuery<DocumentToAccept[]>({
    queryKey: documentsToAcceptKey(userId),
    enabled: userId !== null,
    queryFn: async () => fetchDocumentsToAccept(await requireClient()),
  });

  // Step 2: accepting records the versions in the language on screen, then asks again.
  const acceptance = useMutation({
    mutationFn: async (documentSlugs: string[]) =>
      acceptDocuments(await requireClient(), documentSlugs, i18n.language),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsToAcceptKey(userId) }),
  });

  return {
    documentsToAccept: userId === null ? [] : (waiting.data ?? []),
    accept: (documentSlugs: string[]) => acceptance.mutate(documentSlugs),
    isAccepting: acceptance.isPending,
    acceptFailed: acceptance.isError,
  };
}
