/**
 * Hooks for music and video cards (story S1-E3-10): the writer's own cards, and adding one from
 * the Add music or video dialog.
 *
 * Who calls them: the editor's card (ChapterEmbedNodeView), the writer's preview
 * (ChapterPreviewDialog) and the dialog (EmbedInsertDialog).
 * What they call: ../api/embeds.ts fetchMyEmbeds() and addChapterEmbed().
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { addChapterEmbed, fetchMyEmbeds, type EmbedAddition, type EmbedView } from '../api/embeds';

/**
 * The caller's own cards among the IDs.
 *
 * @param embedIds - the cards in the text, in any order
 * @returns embeds (by ID; empty until loaded) and whether the read failed
 */
export function useMyEmbeds(embedIds: string[]) {
  const sortedIds = [...embedIds].sort();
  const embeds = useQuery<Record<string, EmbedView>>({
    queryKey: ['my-embeds', sortedIds],
    enabled: sortedIds.length > 0,
    queryFn: async () => fetchMyEmbeds(await requireClient(), sortedIds),
  });
  return { embeds: embeds.data ?? {}, loadFailed: embeds.isError };
}

/**
 * One card addition at a time.
 *
 * @returns add(addition) (a promise of the new card), isAdding, the last error and reset()
 */
export function useEmbedAddition() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (addition: EmbedAddition) => addChapterEmbed(await requireClient(), addition),
    onSuccess: () => {
      // The new card shows in the editor and the preview.
      void queryClient.invalidateQueries({ queryKey: ['my-embeds'] });
    },
  });
  return {
    add: mutation.mutateAsync,
    isAdding: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
