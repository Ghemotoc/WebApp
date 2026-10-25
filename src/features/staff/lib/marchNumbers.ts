/**
 * Small pure helpers for the staff Metrics page (story S1-E15-02): how far a number is towards
 * its March target, and a market's name in the interface language.
 *
 * Who calls them: MarchTargetCard and MarchNumberLists. They live here, not in the components,
 * so the components' files export components only (fast refresh) and the helpers have unit tests.
 */

/**
 * How far the number is towards its target.
 *
 * @param value - the number, or null
 * @param target - the target
 * @returns 0 to 100
 */
export function progressTowards(value: number | null, target: number): number {
  if (value === null || target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

/**
 * A market's name in the reader's language: "Romania", or "Other countries".
 *
 * @param market - a country code or "other"
 * @param language - the interface language
 * @param otherLabel - the words for "other"
 * @returns the name
 */
export function marketName(market: string, language: string, otherLabel: string): string {
  if (market === 'other') return otherLabel;
  return new Intl.DisplayNames([language], { type: 'region' }).of(market) ?? market;
}
