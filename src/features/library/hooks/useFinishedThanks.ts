/**
 * useFinishedThanks: sends "I finished it" to a story's writer (bundle IDEAS-1, part c; idea
 * IDEA-20261031-3) and remembers that it went.
 *
 * Who calls it: FinishedThanksButton on the story page. What it calls: api/library.ts →
 * send_finished_thanks(). After a send (or an "already sent"), the story's library state is
 * marked as thanked at once, so the button reads "Sent" without waiting for a new read.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { sendFinishedThanks, type StoryLibraryState } from '../api/library';
import { libraryQueryKey } from '../libraryQueryKey';

/**
 * Sends the thank-you for one story.
 *
 * @param storySlug - the story's address
 * @returns send(), isSending, outcome (the last answer, or null) and failed (the call threw)
 */
export function useFinishedThanks(storySlug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  // The same key useStoryLibraryState reads, so both see the change.
  const stateKey = [libraryQueryKey, 'story', storySlug, userId];
  const send = useMutation({
    mutationFn: async () => sendFinishedThanks(await requireClient(), storySlug),
    onSuccess: (outcome) => {
      // Step 1: only a sent thank-you (now or before) turns the button into "Sent".
      if (outcome !== 'ok' && outcome !== 'already_sent') return;
      queryClient.setQueryData<StoryLibraryState | null>(stateKey, (old) =>
        old === null || old === undefined ? old : { ...old, thanksSent: true },
      );
    },
  });
  return {
    send: () => send.mutate(),
    isSending: send.isPending,
    outcome: send.data ?? null,
    failed: send.isError,
  };
}
