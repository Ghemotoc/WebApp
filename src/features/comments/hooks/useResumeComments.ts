/**
 * useResumeComments: "Resume now", which the story's writer sees beside the paused line while new
 * comments are paused (bundle CALM-8; IDEA-20261109-8; the design handover's Step 4, point 8).
 *
 * Who calls it: components/CommentsPausedLine.tsx.
 * What it calls: api/commentPause.ts → end_my_comment_pause(), which ends the pause in every
 * language of the story. After it, the story's comment lists are read again: the comments under the
 * chapter, the paragraph counts and any open paragraph thread all have keys that start with
 * storyCommentsQueryKey(), so the comment box and Reply come back at once.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { ChapterAddress } from '@/features/reading/api/likes';

import { endMyCommentPause, type ResumeOutcome } from '../api/commentPause';

/** Why "Resume now" didn't work: the account can't change stories now, or anything else. */
export type ResumeFailure = 'not_active' | 'other';

/**
 * The start every comment list of one story shares in the cache (commentsQueryKey() in
 * useChapterComments.ts adds the chapter and the reader), so one call reads all of them again.
 *
 * @param storySlug - the story's address
 * @returns the key's start
 */
export function storyCommentsQueryKey(storySlug: string) {
  return ['chapter-comments', storySlug];
}

/**
 * What went wrong, in the words the line can show.
 *
 * @param outcome - what the database answered, or undefined before it answered
 * @param hasThrown - true when the call itself failed (no connection, signed out)
 * @returns null when nothing went wrong, otherwise the failure
 */
function resumeFailureOf(
  outcome: ResumeOutcome | undefined,
  hasThrown: boolean,
): ResumeFailure | null {
  if (hasThrown) return 'other';
  if (outcome === 'not_active') return 'not_active';
  // not_found means the story isn't the caller's (or is gone): only its writer is offered the
  // button, so it is a plain failure.
  if (outcome === 'not_found') return 'other';
  return null;
}

/**
 * Ends the pause on the chapter's story.
 *
 * @param address - the chapter the line sits under (its story's address is what counts)
 * @returns resume(), isResuming while the call runs, and the last failure or null
 */
export function useResumeComments(address: ChapterAddress) {
  const queryClient = useQueryClient();
  const resume = useMutation({
    // Step 1: ask the database to end the pause; it checks that the story is the caller's own.
    mutationFn: async () => endMyCommentPause(await requireClient(), address.storySlug),
    // Step 2: once it has ended, read the story's comment lists again, so the box comes back.
    onSuccess: async (outcome) => {
      if (outcome !== 'ok') return;
      await queryClient.invalidateQueries({ queryKey: storyCommentsQueryKey(address.storySlug) });
    },
  });
  return {
    resume: () => resume.mutate(),
    isResuming: resume.isPending,
    failure: resumeFailureOf(resume.data, resume.isError),
  };
}
