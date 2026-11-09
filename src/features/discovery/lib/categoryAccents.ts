/**
 * Each category's accent colour (story S1-E5-01, first criterion: "the category's accent
 * colour"). The accents reuse the pill tones, so they have their night-mode versions and their
 * text contrast already checked (src/styles/tokens.css; DoD pill system).
 * Who uses it: StoryListFilters (the coloured dot) and StoryListHeader (the deep band on a category
 * page, bundle G7c).
 */
import type { PillTone } from '@/components/ui/InfoPill';

/** The accent of the three March categories; any other category is neutral. */
const accentByCategory: Record<string, PillTone> = {
  fiction: 'plum',
  poetry: 'gold',
  nonfiction_essays: 'sage',
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
 * The deep band at the top of a category page (bundle G7c; board DiscoverGenre): the tone's
 * gradient from tokens.css, which carries white text (the genre-band utility).
 */
export const accentDeepBandClasses: Record<PillTone, string> = {
  plum: 'bg-[linear-gradient(135deg,var(--band-plum-from),var(--band-plum-to)_70%)]',
  sage: 'bg-[linear-gradient(135deg,var(--band-sage-from),var(--band-sage-to)_70%)]',
  gold: 'bg-[linear-gradient(135deg,var(--band-gold-from),var(--band-gold-to)_70%)]',
  sky: 'bg-[linear-gradient(135deg,var(--band-sky-from),var(--band-sky-to)_70%)]',
  neutral: 'bg-[linear-gradient(135deg,var(--band-neutral-from),var(--band-neutral-to)_70%)]',
  blush: 'bg-[linear-gradient(135deg,var(--band-blush-from),var(--band-blush-to)_70%)]',
};
