/**
 * useOccasionSchedule: the seasonal doodle schedule for Staff › Website › Seasonal doodles, and
 * the two things staff do to it: save an occasion and remove one (story S1-E11-11).
 *
 * Who calls it: components/staff/SeasonalTab.tsx.
 * What it calls: api/seasonalStore.ts. After every change it reads the schedule again and drops
 * the readers' cached doodle, so this browser shows the change at once; other readers get it
 * within a minute. The last failure keeps the database's problem words for the form's fields.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { WebsiteContentError } from '@/features/website/api/websiteContentStore';

import {
  listOccasions,
  removeOccasion,
  saveOccasion,
  type Occasion,
  type OccasionDraft,
} from '../api/seasonalStore';

/** One change to the schedule. */
export type OccasionAction =
  { kind: 'save'; draft: OccasionDraft } | { kind: 'remove'; occasionId: string };

/** What the schedule screen gets. */
export interface OccasionSchedule {
  occasions: Occasion[];
  isLoading: boolean;
  loadFailed: boolean;
  act: (action: OccasionAction) => Promise<boolean>;
  isBusy: boolean;
  failure: WebsiteContentError | null;
  outcome: { action: string; goesLive: null } | null;
  clearFeedback: () => void;
}

/**
 * Carries out one change.
 *
 * @param action - what to do
 */
async function runOccasionAction(action: OccasionAction): Promise<void> {
  const client = await requireClient();
  if (action.kind === 'save') await saveOccasion(client, action.draft);
  else await removeOccasion(client, action.occasionId);
}

/**
 * The schedule and its actions.
 *
 * @returns the occasions, their state and the actions
 */
export function useOccasionSchedule(): OccasionSchedule {
  const queryClient = useQueryClient();
  const [failure, setFailure] = useState<WebsiteContentError | null>(null);
  const [outcome, setOutcome] = useState<OccasionSchedule['outcome']>(null);
  // Step 1: the schedule, as owner and admin may read it.
  const schedule = useQuery({
    queryKey: ['seasonal-occasions'],
    queryFn: async () => listOccasions(await requireClient()),
  });
  // Step 2: one change, then read again; a refusal is kept for the form.
  const mutation = useMutation({ mutationFn: runOccasionAction });
  const act = async (action: OccasionAction): Promise<boolean> => {
    setFailure(null);
    setOutcome(null);
    try {
      await mutation.mutateAsync(action);
      setOutcome({
        action: action.kind === 'save' ? 'occasionSaved' : 'occasionRemoved',
        goesLive: null,
      });
      await queryClient.invalidateQueries({ queryKey: ['seasonal-occasions'] });
      await queryClient.invalidateQueries({ queryKey: ['seasonal-doodle'] });
      return true;
    } catch (error) {
      setFailure(
        error instanceof WebsiteContentError
          ? error
          : new WebsiteContentError('unreachable', String(error), [], null),
      );
      return false;
    }
  };
  return {
    occasions: schedule.data ?? [],
    isLoading: schedule.isLoading,
    loadFailed: schedule.isError,
    act,
    isBusy: mutation.isPending,
    failure,
    outcome,
    clearFeedback: () => {
      setFailure(null);
      setOutcome(null);
    },
  };
}
