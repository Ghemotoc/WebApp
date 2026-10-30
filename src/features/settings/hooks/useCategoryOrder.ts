/**
 * useCategoryOrder: the categories in the order readers see them, and moving one (story S1-E11-03).
 *
 * Who calls it: CategoriesSection. What it calls: api/settingsAdmin.ts. After a move the new
 * story form and Discover's category shelves read the order again ('story-categories').
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchCategoryOrder, moveCategory } from '../api/settingsAdmin';

import { shownFailureOf } from './settingsFailure';

/**
 * Follows the category order.
 *
 * @returns the slugs in order, move(slug, by), and the load and move states
 */
export function useCategoryOrder() {
  const queryClient = useQueryClient();
  const order = useQuery({
    queryKey: ['settings-admin', 'categories'],
    retry: false,
    queryFn: async () => fetchCategoryOrder(await requireClient()),
  });
  const mutation = useMutation({
    mutationFn: async (move: { slug: string; by: -1 | 1 }) =>
      moveCategory(await requireClient(), move.slug, move.by),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings-admin', 'categories'] });
      await queryClient.invalidateQueries({ queryKey: ['story-categories'] });
    },
  });
  return {
    slugs: order.data ?? [],
    loadFailure: shownFailureOf(order.isError, order.error),
    move: (slug: string, by: -1 | 1) => mutation.mutate({ slug, by }),
    isMoving: mutation.isPending,
    moveFailure: shownFailureOf(mutation.isError, mutation.error),
  };
}
