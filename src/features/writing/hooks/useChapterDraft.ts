/**
 * useChapterDraft: loads one of the writer's own chapters for the editor (story S1-E3-02a).
 *
 * Who calls it: ChapterEditorPage. What it calls: api/chapters.ts → the chapters table
 * (chapters_select_own), so only the owner ever gets a row; anyone else sees "not found".
 * The query is keyed by the chapter's code and the person, and is never refetched while the
 * editor is open (the editor owns the text from then on; the autosave keeps the version).
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchMyChapter, type MyChapter } from '../api/chapters';

/** The query key, so a save can refresh the writer's lists without touching the open editor. */
export const myChapterKey = (userId: string | null, code: string) => ['my-chapter', userId, code];

/**
 * Loads the chapter.
 *
 * @param code - the chapter's code from the address
 * @returns chapter (null until loaded, or when it isn't the writer's), isSignedIn, isKnown
 *   (the answer is in), loadFailed
 */
export function useChapterDraft(code: string) {
  const { userId, isKnown: isSessionKnown } = useSession();
  const chapter = useQuery<MyChapter | null>({
    queryKey: myChapterKey(userId, code),
    enabled: userId !== null,
    queryFn: async () => fetchMyChapter(await requireClient(), code),
    // The editor takes over the text once loaded: a refetch would overwrite what is being typed.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return {
    chapter: chapter.data ?? null,
    isSignedIn: userId !== null,
    isKnown: isSessionKnown && (userId === null || !chapter.isPending),
    loadFailed: chapter.isError,
  };
}
