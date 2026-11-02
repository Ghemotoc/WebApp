/**
 * useParentLink: what a parent's or guardian's data request link points to, their answer and
 * opening the copy (bundle ADMIN-2, part c3; story S1-E11-09 criterion 5 and "for a parent, a
 * one-time link to the checked email address").
 *
 * Who calls it: DataRequestParentPage. What it calls: api/dataRequestParent.ts. Works signed out:
 * the link's token is the key. After an answer the link is read again, so the page shows where
 * it now stands.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  answerParentCheck,
  fetchParentLink,
  openParentCopy,
  type ParentLink,
} from '../api/dataRequestParent';

/** The cache key of one link. */
const parentLinkKey = (token: string) => ['data-request-parent-link', token];

/**
 * Follows one parent's link.
 *
 * @param token - the token from the link ("" when the link has none)
 * @returns link (null for one that doesn't work, undefined while loading), loadFailed,
 *   answer(isOurs) with isAnswering and answerFailed, and open() with what it opened
 */
export function useParentLink(token: string) {
  const queryClient = useQueryClient();
  const link = useQuery<ParentLink>({
    queryKey: parentLinkKey(token),
    enabled: token !== '',
    queryFn: async () => fetchParentLink(await requireClient(), token),
  });
  const answering = useMutation({
    mutationFn: async (isOurs: boolean) => answerParentCheck(await requireClient(), token, isOurs),
    onSettled: () => queryClient.invalidateQueries({ queryKey: parentLinkKey(token) }),
  });
  const opening = useMutation({
    mutationFn: async () => openParentCopy(await requireClient(), token),
  });
  return {
    link: token === '' ? null : link.data,
    loadFailed: link.isError,
    answer: (isOurs: boolean) => answering.mutate(isOurs),
    isAnswering: answering.isPending,
    answerFailed: answering.isError,
    open: () => opening.mutate(),
    isOpening: opening.isPending,
    opened: opening.data ?? null,
    openFailed: opening.isError,
  };
}
