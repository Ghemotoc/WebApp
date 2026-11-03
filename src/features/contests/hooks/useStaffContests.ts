/**
 * useStaffContests and useContestEditor: Staff › Contests (story S1-E11-15 criteria 1 and 2;
 * bundle CONTESTS-13b1).
 *
 * Who calls them: StaffContestsPage (the list and "New contest") and ContestEditorPage (one
 * contest). What they call: api/contests.ts. After every change they read the contests and the
 * contest's problems again, so the editor always shows what still stops it from opening.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { ContestDetails } from '@/schemas/contests';

import {
  createContest,
  fetchContestChoices,
  fetchContestProblems,
  fetchFreeContestPages,
  fetchStaffContests,
  openContest,
  saveContest,
} from '../api/contests';

import { contestFailureOf, contestsQueryKey } from './useStoryContests';

/** The key of the staff reads. */
const staffContestsKey = [...contestsQueryKey, 'staff'] as const;

/**
 * Every contest, the contest pages without one, and "New contest".
 *
 * @returns the contests, the free pages, create() and its failure
 */
export function useStaffContests() {
  const queryClient = useQueryClient();
  const contests = useQuery({
    queryKey: [...staffContestsKey, 'list'],
    queryFn: async () => fetchStaffContests(await requireClient()),
  });
  const freePages = useQuery({
    queryKey: [...staffContestsKey, 'free-pages', contests.data?.length ?? -1],
    queryFn: async () => fetchFreeContestPages(await requireClient(), contests.data ?? []),
    enabled: contests.data !== undefined,
  });
  const creation = useMutation({
    mutationFn: async (pageSlug: string) => createContest(await requireClient(), pageSlug),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffContestsKey }),
  });
  return {
    contests,
    freePages: freePages.data ?? [],
    create: creation.mutateAsync,
    isCreating: creation.isPending,
    createFailure: contestFailureOf(creation.error),
  };
}

/**
 * One contest in the editor: its details, the choices for "Who can enter", what stops it from
 * opening, Save and Open.
 *
 * @param contestId - the contest
 * @returns the contest (undefined while loading, null when unknown), the choices, the problems,
 *   save(), open() and the last action's outcome
 */
export function useContestEditor(contestId: string) {
  const queryClient = useQueryClient();
  const contests = useQuery({
    queryKey: [...staffContestsKey, 'list'],
    queryFn: async () => fetchStaffContests(await requireClient()),
  });
  const choices = useQuery({
    queryKey: [...staffContestsKey, 'choices'],
    queryFn: async () => fetchContestChoices(await requireClient()),
  });
  const problems = useQuery({
    queryKey: [...staffContestsKey, 'problems', contestId],
    queryFn: async () => fetchContestProblems(await requireClient(), contestId),
  });
  const action = useMutation({
    mutationFn: async (wanted: { kind: 'save'; details: ContestDetails } | { kind: 'open' }) => {
      const client = await requireClient();
      if (wanted.kind === 'save') await saveContest(client, contestId, wanted.details);
      else await openContest(client, contestId);
      return wanted.kind;
    },
    // Saved or opened: read the contest and its problems again.
    onSettled: () => queryClient.invalidateQueries({ queryKey: staffContestsKey }),
  });
  const contest = contests.data?.find((candidate) => candidate.id === contestId);
  return {
    contest: contests.data === undefined ? undefined : (contest ?? null),
    loadFailed: contests.isError || choices.isError,
    choices: choices.data ?? { marketCodes: [], languageCodes: [] },
    problems: problems.data ?? [],
    save: (details: ContestDetails) => action.mutate({ kind: 'save', details }),
    open: () => action.mutate({ kind: 'open' }),
    isBusy: action.isPending,
    lastAction: action.isSuccess ? action.data : null,
    failure: contestFailureOf(action.error),
  };
}
