/**
 * useClassics: the staff Classics list, the author list and every change to a work (story
 * S1-E11-16).
 *
 * Who calls it: components/classics/ClassicsPage.tsx. What it calls: api/classics.ts. After every
 * change the list is read again, so the page always shows what the database holds; the authors
 * list is read again after one is added.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  addClassicAuthor,
  ClassicsError,
  listClassicAuthors,
  listClassics,
  publishClassic,
  saveClassicWork,
  setClassicChapters,
  unpublishClassic,
  type ClassicAuthorChoice,
  type ClassicChapterDraft,
  type ClassicDetails,
  type ClassicsFailure,
  type ClassicWork,
} from '../api/classics';

/** The cache keys. */
const classicsKey = ['staff-classics'];
const authorsKey = ['staff-classic-authors'];

/**
 * The reason a call failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a ClassicsError
 */
function failureOf(hasFailed: boolean, error: unknown): ClassicsFailure | null {
  if (!hasFailed) return null;
  return error instanceof ClassicsError ? error.failure : 'unreachable';
}

/** One change to a work, as the page asks for it. */
export type ClassicChange =
  | { kind: 'save'; storyId: string | null; details: ClassicDetails }
  | { kind: 'text'; storyId: string; chapters: ClassicChapterDraft[] }
  | { kind: 'publish'; storyId: string }
  | { kind: 'unpublish'; storyId: string; reason: string };

/**
 * Sends one change to the database.
 *
 * @param change - what to do
 * @returns the work as saved
 */
async function applyChange(change: ClassicChange): Promise<ClassicWork> {
  const client = await requireClient();
  if (change.kind === 'save') return saveClassicWork(client, change.storyId, change.details);
  if (change.kind === 'text') return setClassicChapters(client, change.storyId, change.chapters);
  if (change.kind === 'publish') return publishClassic(client, change.storyId);
  return unpublishClassic(client, change.storyId, change.reason);
}

/**
 * Follows the classics and the authors.
 *
 * @returns the lists, change() and addAuthor(), and their states
 */
export function useClassics() {
  const queryClient = useQueryClient();
  const works = useQuery<ClassicWork[]>({
    queryKey: classicsKey,
    retry: false,
    queryFn: async () => listClassics(await requireClient()),
  });
  const authors = useQuery<ClassicAuthorChoice[]>({
    queryKey: authorsKey,
    retry: false,
    queryFn: async () => listClassicAuthors(await requireClient()),
  });
  const change = useMutation({
    mutationFn: applyChange,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classicsKey }),
  });
  const author = useMutation({
    mutationFn: async (wanted: { name: string; diedYear: number }) =>
      addClassicAuthor(await requireClient(), wanted.name, wanted.diedYear),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authorsKey }),
  });

  return {
    works: works.data ?? [],
    isLoading: works.isPending,
    loadFailure: failureOf(works.isError, works.error),
    authors: authors.data ?? [],
    change: (wanted: ClassicChange) => change.mutateAsync(wanted),
    isChanging: change.isPending,
    changeFailure: failureOf(change.isError, change.error),
    lastChange: change.isSuccess ? (change.variables?.kind ?? null) : null,
    resetChange: () => change.reset(),
    addAuthor: (name: string, diedYear: number) => author.mutateAsync({ name, diedYear }),
    authorFailure: failureOf(author.isError, author.error),
  };
}
