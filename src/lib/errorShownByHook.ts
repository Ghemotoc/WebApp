/**
 * The one handler for "this promise's error is already shown on screen" (QA-5, finding R7).
 *
 * Who calls it: event handlers that start a TanStack Query mutation with `mutateAsync()` (or a
 * hook's own async action) and don't need its answer, for example
 *   void report.mutateAsync(values).catch(errorShownByHook);
 * Why it exists: `mutateAsync()` rejects when the call fails, and an unhandled rejection would
 * reach the browser's error log as a crash. The failure itself is not lost: the hook keeps it in
 * its `error` state and the component shows it in plain words, in both languages (CLAUDE.md:
 * "never swallow an error silently"). Before QA-5 these places caught with `() => undefined`
 * (an empty arrow function), which read as an error thrown away; the name says where it went.
 * Use it only where the hook really shows the error. Anywhere else, handle the error where it
 * happens.
 *
 * @returns nothing; the hook's error state already holds the error
 */
export function errorShownByHook(): void {
  // Nothing to do here: the hook that made the call shows its error (see above).
}
