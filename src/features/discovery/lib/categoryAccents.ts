/**
 * Each category's accent colour (story S1-E5-01, first criterion: "the category's accent
 * colour"). The accents reuse the pill tones, so they have their night-mode versions and their
 * text contrast already checked (src/styles/tokens.css; DoD pill system).
 * Who uses it: StoryListFilters (the coloured dot) and StoryListHeader (the deep band on a category
 * page, bundle G7c).
 */
import type { PillTone } from '@/components/ui/InfoPill';

/** The accent of each of the four forms (FORMS-1, 27 Nov 2026); any other category is neutral. */
const accentByCategory: Record<string, PillTone> = {
  fiction: 'plum',
  poetry: 'gold',
  nonfiction_essays: 'sage',
  plays: 'blush',
};

/**
 * The accent tone for a category.
 *
 * @param categorySlug - the category's key, such as "poetry"
 * @returns the pill tone that colours it
 */
export function categoryAccent(categorySlug: string): PillTone {
  return accentByCategory[categorySlug] ?? 'neutral';
}

/**
 * The deep band at the top of a category page (bundle G7c; board DiscoverGenre): the tone's one
 * flat colour from tokens.css (no gradients, Robert, 23 Nov 2026), which carries white text (the
 * genre-band utility).
 */
export const accentDeepBandClasses: Record<PillTone, string> = {
  plum: 'bg-[var(--band-plum-from)]',
  sage: 'bg-[var(--band-sage-from)]',
  gold: 'bg-[var(--band-gold-from)]',
  sky: 'bg-[var(--band-sky-from)]',
  neutral: 'bg-[var(--band-neutral-from)]',
  blush: 'bg-[var(--band-blush-from)]',
};
