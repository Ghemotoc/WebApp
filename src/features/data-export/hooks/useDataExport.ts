/**
 * The hooks behind Settings › Download my data (story S1-E13-02).
 *
 * Who calls them: DownloadMyDataSection (and useStoriesExport.ts reuses useWordLabels). What they
 * call: api/dataExport.ts and
 * lib/exportRunStore.ts. The run's state lives in that small store, so it survives the
 * panel closing and opening again while the copy is being made.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useAtlasTranslation } from '@/features/atlas/registerAtlasTranslations';
import { useSession } from '@/features/auth/hooks/useSession';
import { unreadCountQueryKey } from '@/features/notifications/hooks/useUnreadNotificationCount';
import { formatRomaniaDate } from '@/lib/romania-time';
import type { WordLabels } from '@/lib/word/wordTypes';

import { fetchMyDataExports, type DataExport } from '../api/dataExport';
import type { LibraryCsvLabels } from '../lib/libraryForExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';
import {
  dataExportRunState,
  startDataExport,
  subscribeToDataExportRun,
} from '../lib/exportRunStore';
import type { PlanWords } from '../lib/planForWord';
import type { StatusLabels } from '../lib/storiesForWord';

/** The copies' cache key, per person. */
export function dataExportsKey(userId: string | null) {
  return ['data-exports', userId] as const;
}

/**
 * The person's newest copy that can still be used: one being built or one ready and unexpired.
 *
 * @returns TanStack Query's result; data is null when there is none
 */
export function useLatestDataExport() {
  const { userId } = useSession();
  return useQuery({
    queryKey: dataExportsKey(userId),
    enabled: userId !== null,
    retry: false,
    queryFn: async (): Promise<DataExport | null> => {
      const copies = await fetchMyDataExports(await requireClient());
      const now = Date.now();
      const usable = copies.find(
        (copy) =>
          copy.state === 'ready' && copy.expires_at !== null && Date.parse(copy.expires_at) > now,
      );
      return usable ?? null;
    },
  });
}

/**
 * The run's state in this tab: idle, running or failed.
 *
 * @returns the state
 */
export function useDataExportRun() {
  return useSyncExternalStore(subscribeToDataExportRun, dataExportRunState, dataExportRunState);
}

/** The Word files' words in the interface language; Download my stories uses them too. */
export function useWordLabels(): { wordLabels: WordLabels; statusLabels: StatusLabels } {
  const { t } = useDataExportTranslation();
  const wordLabels: WordLabels = {
    byLine: (name) => t('word.byLine', { name }),
    userId: t('word.userId'),
    created: t('word.created'),
    firstPublished: t('word.firstPublished'),
    lastUpdated: t('word.lastUpdated'),
    lastPublished: t('word.lastPublished'),
    notPublishedYet: t('word.notPublishedYet'),
    status: t('word.status'),
    chapterNumber: (number) => t('word.chapterNumber', { number }),
    pictureMissing: (alt) => t('word.pictureMissing', { alt }),
    embedLine: (title) => t('word.embedLine', { title }),
    embedMissing: t('word.embedMissing'),
  };
  const statusLabels: StatusLabels = {
    story: { ongoing: t('word.storyStatus.ongoing'), completed: t('word.storyStatus.completed') },
    chapter: {
      draft: t('word.chapterStatus.draft'),
      scheduled: t('word.chapterStatus.scheduled'),
      published: t('word.chapterStatus.published'),
    },
  };
  return { wordLabels, statusLabels };
}

/**
 * The library spreadsheet's column and shelf names, in the interface language (IDEAS-1f).
 *
 * @returns the labels for library.csv
 */
function useLibraryLabels(): LibraryCsvLabels {
  const { t } = useDataExportTranslation();
  return {
    shelf: t('library.shelf'),
    title: t('library.title'),
    writer: t('library.writer'),
    link: t('library.link'),
    added: t('library.added'),
    shelves: {
      reading: t('library.shelves.reading'),
      saved: t('library.shelves.saved'),
      finished: t('library.shelves.finished'),
    },
  };
}

/**
 * The words of a story's plan file: Story Atlas's own texts (so the file reads like the screens)
 * and the few of its own in dataExport.json (S1-E13-05).
 *
 * @returns the two translators the plan builder takes
 */
export function usePlanText(): Pick<PlanWords, 'atlas' | 'own'> {
  const { t } = useDataExportTranslation();
  const { t: atlasT } = useAtlasTranslation();
  return { atlas: (key, values) => atlasT(key, values), own: (key, values) => t(key, values) };
}

/**
 * Starting a copy: builds it in the background of this tab, then reads the copies and the
 * notification count again.
 *
 * @returns start()
 */
export function useStartDataExport() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  const { i18n } = useDataExportTranslation();
  const { wordLabels, statusLabels } = useWordLabels();
  const planText = usePlanText();
  const libraryLabels = useLibraryLabels();
  return {
    start: async () => {
      await startDataExport({
        client: await requireClient(),
        wordLabels,
        statusLabels,
        planText,
        libraryLabels,
        formatDate: (isoDate) => formatRomaniaDate(new Date(isoDate), i18n.language),
      });
      await queryClient.invalidateQueries({ queryKey: dataExportsKey(userId) });
      await queryClient.invalidateQueries({ queryKey: unreadCountQueryKey(userId) });
    },
  };
}
