/**
 * useMarkAnswer: "This answered it" as a React hook (bundle 14d IDEAS-3, part f; idea
 * IDEA-20261102-8).
 *
 * Who calls it: PostActions. What it calls: api/forumAnswers.ts → mark_forum_thread_answer().
 * After a mark every forum read refreshes, so the thread's link at the top and the list's
 * "Answered" pill match what was saved.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  ForumAnswerError,
  markThreadAnswer,
  type AnswerMark,
  type ForumAnswerFailure,
} from '../api/forumAnswers';

import { forumsQueryKey } from './useForumIndex';

/**
 * Why a mark failed, in the words the screen knows.
 *
 * @param error - whatever the mark threw, or null
 * @returns the forum's own refusal, "unreachable" for anything else, or null when none
 */
function failureOf(error: Error | null): ForumAnswerFailure | null {
  if (error === null) return null;
  return error instanceof ForumAnswerError ? error.failure : 'unreachable';
}

/**
 * Marks a reply as the answer, or takes the mark away.
 *
 * @returns run(mark), the failure (null when none) and isRunning
 */
export function useMarkAnswer() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (mark: AnswerMark) => markThreadAnswer(await requireClient(), mark),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [forumsQueryKey] }),
  });
  return {
    run: mutation.mutateAsync,
    failure: failureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
