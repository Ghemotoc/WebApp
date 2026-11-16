/**
 * useTranslationChapters: the original's chapters with where each translation stands, and the
 * action that starts one (bundle TRANSLATE-1c).
 *
 * Who calls it: TranslateChaptersPage. What it calls: api/storyLanguages.ts →
 * story_translation_chapters() and start_chapter_translation().
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  fetchTranslationChapters,
  startChapterTranslation,
  type TranslationChapter,
} from '../api/storyLanguages';

/** The cache key of one edition's chapter list. */
export const translationChaptersKey = (userId: string | null, editionSlug: string) => [
  'translation-chapters',
  userId,
  editionSlug,
];

/**
 * Follows the list and opens a chapter in the translation editor.
 *
 * @param editionSlug - the address of the language being translated into
 * @returns chapters (null while loading, or when the address isn't a later edition of the
 *   writer's), isLoaded, loadFailed, open(chapter), the chapter being opened and startFailed
 */
export function useTranslationChapters(editionSlug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [openingCode, setOpeningCode] = useState<string | null>(null);
  const [startFailed, setStartFailed] = useState(false);
  const chapters = useQuery<TranslationChapter[] | null>({
    queryKey: translationChaptersKey(userId, editionSlug),
    enabled: userId !== null && editionSlug !== '',
    queryFn: async () => fetchTranslationChapters(await requireClient(), editionSlug),
  });

  /** Opens a chapter's translation, creating its draft the first time. */
  async function open(chapter: TranslationChapter) {
    setStartFailed(false);
    setOpeningCode(chapter.originalCode);
    try {
      // Step 1: a translation that exists opens as it is; a new one is created first.
      const code =
        chapter.code ??
        (await startChapterTranslation(await requireClient(), editionSlug, chapter.originalCode));
      if (code === null) return setStartFailed(true);
      // Step 2: the list shows the new draft when the writer comes back.
      await queryClient.invalidateQueries({
        queryKey: translationChaptersKey(userId, editionSlug),
      });
      await navigate(`/write/s/${editionSlug}/translate/${code}`);
    } catch {
      // The database couldn't be reached: say so; the writer presses the button again.
      setStartFailed(true);
    } finally {
      setOpeningCode(null);
    }
  }

  return {
    chapters: chapters.data ?? null,
    isLoaded: !chapters.isPending,
    loadFailed: chapters.isError,
    open: (chapter: TranslationChapter) => void open(chapter),
    openingCode,
    startFailed,
  };
}
