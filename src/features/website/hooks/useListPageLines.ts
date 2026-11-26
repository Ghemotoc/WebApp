/**
 * useListPageLines and useSaveListPageLine: the data behind "Lines under the title" on Staff ›
 * Website › Genre and tag pages (BOOKS-A06 and BOOKS-A09).
 *
 * Who calls them: ListLinesSection.
 * What they call: api/staff/listPageLines.ts. After a change the staff list and every
 * visitor-side line on this device are read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  fetchListPageLines,
  saveListPageLine,
  type PageLinePlace,
} from '../api/staff/listPageLines';

/** The staff page's query key. */
const listPageLinesKey = ['staff-list-page-lines'] as const;

/**
 * Every saved line.
 *
 * @returns the query; data is the lines
 */
export function useListPageLines() {
  return useQuery({
    queryKey: listPageLinesKey,
    retry: false,
    queryFn: async () => fetchListPageLines(await requireClient()),
  });
}

/**
 * Writes, changes or clears a page's line.
 *
 * @returns the mutation; its error is a PageLineSaveError
 */
export function useSaveListPageLine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ place, line }: { place: PageLinePlace; line: string }) =>
      saveListPageLine(await requireClient(), place, line),
    onSuccess: async () => {
      // Step 1: the staff list shows the change; step 2: so does any genre or tag page here.
      await queryClient.invalidateQueries({ queryKey: listPageLinesKey });
      await queryClient.invalidateQueries({ queryKey: ['list-page-line'] });
    },
  });
}
