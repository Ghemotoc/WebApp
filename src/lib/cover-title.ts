/**
 * The size of a title we draw on a cover (story S1-E1-03; DoD design rules, covers).
 *
 * The rule: every cover where we draw the title shows the full title, with no ellipsis, line
 * clamp or clipping. Titles wrap on spaces and the size steps down with length: up to 18
 * characters the base size, 19 to 28 × 0.85, 29 to 40 × 0.72, longer × 0.62, never below 11 px.
 * Who calls it: DrawnCover (src/components/covers/DrawnCover.tsx), which every cover goes through (S1-E3-01).
 */

/** The smallest size a drawn cover title may use (DoD). */
export const MINIMUM_COVER_TITLE_SIZE = 11;

/**
 * Works out the font size for a title drawn on a cover.
 *
 * @param title - the full story title
 * @param baseSize - the size for short titles, in pixels (21 on shelf cards, per the boards)
 * @returns the font size in pixels, never below 11
 */
export function coverTitleSize(title: string, baseSize: number): number {
  const length = title.trim().length;

  // Pick the step for this length.
  let scale = 0.62;
  if (length <= 18) scale = 1;
  else if (length <= 28) scale = 0.85;
  else if (length <= 40) scale = 0.72;

  return Math.max(MINIMUM_COVER_TITLE_SIZE, Math.round(baseSize * scale * 10) / 10);
}
