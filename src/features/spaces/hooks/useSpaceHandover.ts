/**
 * Handing a space over as React hooks (bundle 14d IDEAS-3, part e; idea IDEA-20261102-7).
 *
 * Who calls it: SpaceHandoverCard (Space settings) and SpaceHandoverOffer (the space page). What
 * it calls: ../api/spaceHandover.ts. Every answer refreshes the space, so the offer, the owner
 * and the powers on screen match what was saved.
 */
import { useMutation } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { answerHandover, cancelHandover, offerHandover } from '../api/spaceHandover';

import { spaceFailureOf, useRefreshSpaces } from './useSpaces';

/**
 * Offers the space to a moderator.
 *
 * @param slug - the space's address
 * @returns run(handle), the failure and isRunning
 */
export function useOfferHandover(slug: string) {
  const refresh = useRefreshSpaces();
  const mutation = useMutation({
    mutationFn: async (handle: string) => offerHandover(await requireClient(), slug, handle),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Takes the open offer back.
 *
 * @param slug - the space's address
 * @returns run(), the failure and isRunning
 */
export function useCancelHandover(slug: string) {
  const refresh = useRefreshSpaces();
  const mutation = useMutation({
    mutationFn: async () => cancelHandover(await requireClient(), slug),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}

/**
 * Accepts or declines the offer.
 *
 * @param slug - the space's address
 * @returns run(accept), the failure and isRunning
 */
export function useAnswerHandover(slug: string) {
  const refresh = useRefreshSpaces();
  const mutation = useMutation({
    mutationFn: async (accept: boolean) => answerHandover(await requireClient(), slug, accept),
    onSuccess: refresh,
  });
  return {
    run: mutation.mutateAsync,
    failure: spaceFailureOf(mutation.error),
    isRunning: mutation.isPending,
  };
}
