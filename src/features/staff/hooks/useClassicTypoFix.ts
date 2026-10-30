/**
 * useClassicTypoFix: one live classic chapter's text and the typo fix that corrects it, for
 * /staff/classics (story S1-E11-16, part 16b).
 *
 * Who calls it: components/classics/ClassicTypoFix.tsx. What it calls: api/classicsImport.ts.
 * After a fix the chapter is read again, so the form shows the text readers now see.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { ClassicsError, type ClassicsFailure } from '../api/classics';
import {
  fetchLiveClassicChapter,
  fixClassicTypo,
  type LiveClassicChapter,
} from '../api/classicsImport';

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

/**
 * Follows one live chapter and its typo fix.
 *
 * @param chapterCode - the chapter's code, or null while none is picked
 * @returns the chapter, fix(), and their states
 */
export function useClassicTypoFix(chapterCode: string | null) {
  const queryClient = useQueryClient();
  const chapterKey = ['staff-classic-chapter', chapterCode];
  const chapter = useQuery<LiveClassicChapter>({
    queryKey: chapterKey,
    enabled: chapterCode !== null,
    retry: false,
    queryFn: async () => fetchLiveClassicChapter(await requireClient(), chapterCode ?? ''),
  });
  const fixing = useMutation({
    mutationFn: async (wanted: { body: string; reason: string }) =>
      fixClassicTypo(await requireClient(), chapterCode ?? '', wanted.body, wanted.reason),
    onSuccess: (fixed) => queryClient.setQueryData(chapterKey, fixed),
  });
  return {
    chapter: chapter.data ?? null,
    loadFailure: failureOf(chapter.isError, chapter.error),
    fix: (body: string, reason: string) => fixing.mutate({ body, reason }),
    isFixing: fixing.isPending,
    isFixed: fixing.isSuccess,
    fixFailure: failureOf(fixing.isError, fixing.error),
    resetFix: () => fixing.reset(),
  };
}
