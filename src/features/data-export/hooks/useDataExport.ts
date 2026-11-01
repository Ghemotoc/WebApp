/**
 * The hooks behind Settings › Download my data (story S1-E13-02).
 *
 * Who calls them: DownloadMyDataSection. What they call: api/dataExport.ts and
 * lib/runDataExport.ts. The run's state lives in runDataExport's small store, so it survives the
 * panel closing and opening again while the copy is being made.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { unreadCountQueryKey } from '@/features/notifications/hooks/useUnreadNotificationCount';
import { formatRomaniaDate } from '@/lib/romania-time';
import type { WordLabels } from '@/lib/word/wordTypes';

import { fetchMyDataExports, type DataExport } from '../api/dataExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';
import {
  dataExportRunState,
  startDataExport,
  subscribeToDataExportRun,
} from '../lib/runDataExport';
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

/** The Word files' words in the interface language. */
function useWordLabels(): { wordLabels: WordLabels; statusLabels: StatusLabels } {
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
  return {
    start: async () => {
      await startDataExport({
        client: await requireClient(),
        wordLabels,
        statusLabels,
        formatDate: (isoDate) => formatRomaniaDate(new Date(isoDate), i18n.language),
      });
      await queryClient.invalidateQueries({ queryKey: dataExportsKey(userId) });
      await queryClient.invalidateQueries({ queryKey: unreadCountQueryKey(userId) });
    },
  };
}
