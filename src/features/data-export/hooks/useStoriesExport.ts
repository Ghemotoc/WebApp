/**
 * The hooks behind Settings › Download my data › Download my stories (story S1-E13-05).
 *
 * Who calls them: DownloadMyStoriesBlock. What they call: api/dataExport.ts (the my_stories
 * copies) and lib/exportRunStore.ts (the run, which survives the panel closing).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { unreadCountQueryKey } from '@/features/notifications/hooks/useUnreadNotificationCount';
import { formatRomaniaDate } from '@/lib/romania-time';

import { fetchMyDataExports, type DataExport } from '../api/dataExport';
import {
  startStoriesExport,
  storiesExportRunState,
  subscribeToStoriesExportRun,
} from '../lib/exportRunStore';
import type { StoriesExportOutcome } from '../lib/runStoriesExport';
import { useDataExportTranslation } from '../registerDataExportTranslations';

import { useWordLabels } from './useDataExport';

/** The Word files' cache key, per person. */
export function storiesExportsKey(userId: string | null) {
  return ['stories-exports', userId] as const;
}

/**
 * The writer's newest Word files that can still be downloaded: ready and unexpired.
 *
 * @returns TanStack Query's result; data is null when there are none
 */
export function useLatestStoriesExport() {
  const { userId } = useSession();
  return useQuery({
    queryKey: storiesExportsKey(userId),
    enabled: userId !== null,
    retry: false,
    queryFn: async (): Promise<DataExport | null> => {
      const copies = await fetchMyDataExports(await requireClient(), 'my_stories');
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
export function useStoriesExportRun() {
  return useSyncExternalStore(
    subscribeToStoriesExportRun,
    storiesExportRunState,
    storiesExportRunState,
  );
}

/**
 * "Get Word files": makes them in the background of this tab (or finds the earlier ones), then
 * reads the copies and the notification count again.
 *
 * @returns start(storyId), which answers 'reused', 'made' or null after a failure
 */
export function useStartStoriesExport() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  const { i18n } = useDataExportTranslation();
  const { wordLabels, statusLabels } = useWordLabels();
  return {
    start: async (storyId: string | null): Promise<StoriesExportOutcome | null> => {
      const outcome = await startStoriesExport({
        client: await requireClient(),
        wordLabels,
        statusLabels,
        formatDate: (isoDate) => formatRomaniaDate(new Date(isoDate), i18n.language),
        storyId,
      });
      await queryClient.invalidateQueries({ queryKey: storiesExportsKey(userId) });
      await queryClient.invalidateQueries({ queryKey: unreadCountQueryKey(userId) });
      return outcome;
    },
  };
}
