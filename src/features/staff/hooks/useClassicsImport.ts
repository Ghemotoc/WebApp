/**
 * useClassicsImport: importing a research list of classics and the 1 January suggestions, for
 * /staff/classics (story S1-E11-16, part 16b).
 *
 * Who calls it: components/classics/ClassicsImport.tsx and ClassicSuggestionsPanel.tsx.
 * What it calls: api/classicsImport.ts. After an import the classics list and the suggestions are
 * read again, so the new drafts show at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { ClassicsError, type ClassicsFailure } from '../api/classics';
import {
  fetchClassicSuggestions,
  importClassics,
  type ClassicListRow,
  type ClassicSuggestions,
} from '../api/classicsImport';

/** The cache keys: the classics list (shared with useClassics) and the suggestions. */
const classicsKey = ['staff-classics'];
const authorsKey = ['staff-classic-authors'];
const suggestionsKey = ['staff-classic-suggestions'];

/**
 * The reason a call failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a ClassicsError
 */
function failureOf(hasFailed: boolean, error: unknown): ClassicsFailure | null {
  if (!hasFailed) return null;
  return error instanceof ClassicsError ? error.failure : 'unreachable';
}

/**
 * Follows an import of a research list.
 *
 * @returns importRows(), the last result and the failure
 */
export function useClassicsImport() {
  const queryClient = useQueryClient();
  const importing = useMutation({
    mutationFn: async (rows: ClassicListRow[]) => importClassics(await requireClient(), rows),
    onSuccess: async () => {
      // New drafts and new authors: every list on the page is read again.
      await Promise.all(
        [classicsKey, authorsKey, suggestionsKey].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
  return {
    importRows: (rows: ClassicListRow[]) => importing.mutate(rows),
    isImporting: importing.isPending,
    result: importing.data ?? null,
    failure: failureOf(importing.isError, importing.error),
  };
}

/**
 * Reads the authors whose works became free on 1 January, and next year's.
 *
 * @returns the suggestions (null until they load) and the failure
 */
export function useClassicSuggestions() {
  const suggestions = useQuery<ClassicSuggestions>({
    queryKey: suggestionsKey,
    retry: false,
    queryFn: async () => fetchClassicSuggestions(await requireClient()),
  });
  return {
    suggestions: suggestions.data ?? null,
    failure: failureOf(suggestions.isError, suggestions.error),
  };
}
