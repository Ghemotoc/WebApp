/**
 * useModerationQueue: the queue screen's state: the filters and the cases they show (story
 * S1-E10-03a).
 *
 * Who calls it: ModerationQueuePage. What it calls: api/moderationQueue.ts → admin_moderation_queue().
 * A filter change reads again at once (a select, not typing, so no query per keystroke), and the
 * list is read again every minute so deadlines keep moving while the page stays open.
 * useOpenCases, below, feeds the tier cards: every open case whatever the filters say.
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  defaultQueueFilters,
  listCases,
  ModerationError,
  type ModerationFailure,
  type QueueCase,
  type QueueFilters,
} from '../api/moderationQueue';

/** How often the list is read again, so deadlines stay fresh. */
const refreshEveryMs = 60_000;

/**
 * The reason a read failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a ModerationError
 */
export function moderationFailureOf(hasFailed: boolean, error: unknown): ModerationFailure | null {
  if (!hasFailed) return null;
  return error instanceof ModerationError ? error.failure : 'unreachable';
}

/**
 * Follows the queue.
 *
 * @returns the filters, how to change them, the cases and the load state
 */
export function useModerationQueue() {
  const [filters, setFilters] = useState<QueueFilters>(defaultQueueFilters);
  const cases = useQuery<QueueCase[]>({
    queryKey: ['moderation', 'queue', filters],
    retry: false,
    refetchInterval: refreshEveryMs,
    queryFn: async () => listCases(await requireClient(), filters),
  });

  return {
    filters,
    setFilters,
    cases: cases.data ?? [],
    isLoading: cases.isPending,
    loadFailure: moderationFailureOf(cases.isError, cases.error),
  };
}

/**
 * Follows every open case the person may see, for the tier cards.
 *
 * @returns the open cases, or none until they arrive
 */
export function useOpenCases(): QueueCase[] {
  const openCases = useQuery<QueueCase[]>({
    queryKey: ['moderation', 'queue', defaultQueueFilters],
    retry: false,
    refetchInterval: refreshEveryMs,
    queryFn: async () => listCases(await requireClient(), defaultQueueFilters),
  });
  return openCases.data ?? [];
}
