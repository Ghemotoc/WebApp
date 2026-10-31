/**
 * The first part of the library's cache keys (story S1-E4-03), so a change of shelf or a saved
 * place refreshes every library list.
 *
 * In a file of its own (READ-4c) so the chapter reader, which only needs the key to refresh the
 * library after saving a place, doesn't fetch the library's hooks with it: the reader must stay
 * inside its 40 KB script budget (e2e/reader-performance.spec.ts).
 * Who uses it: hooks/useLibraryOverview.ts, hooks/useStoryLibraryState.ts and
 * src/features/reading/hooks/useSavedPlace.ts.
 */
export const libraryQueryKey = 'library';
