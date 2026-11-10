/**
 * useHubPrompts: the writing prompts that have started, for the hub card and the new-story
 * screen (bundle GAPS-12c).
 *
 * Who calls it: HubPrompt and PromptNote. What it calls: api/hubPrompts.ts, and useSession so a
 * visitor who isn't signed in never asks the database.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchHubPrompts, type HubPrompt } from '../api/hubPrompts';

/** The cache key, shared so a new story made from a prompt can refresh the count. */
export const hubPromptsKey = ['hub-prompts'];

/**
 * Follows the started prompts, newest first.
 *
 * @returns prompts (empty while loading, signed out or when there are none) and loadFailed
 */
export function useHubPrompts(): { prompts: HubPrompt[]; loadFailed: boolean } {
  const { userId } = useSession();
  const prompts = useQuery<HubPrompt[]>({
    queryKey: hubPromptsKey,
    enabled: userId !== null,
    queryFn: async () => fetchHubPrompts(await requireClient()),
  });
  return { prompts: prompts.data ?? [], loadFailed: prompts.isError };
}
