/**
 * Each category's accent colour (story S1-E5-01, first criterion: "the category's accent
 * colour"). The accents reuse the pill tones, so they have their night-mode versions and their
 * text contrast already checked (src/styles/tokens.css; DoD pill system).
 * Who uses it: CategoryChips (the coloured dot) and StoryListHeader (the band on a category page).
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

/** The band and dot classes for each tone, written out in full so Tailwind can find them. */
export const accentBandClasses: Record<PillTone, string> = {
  plum: 'border-(--pill-plum-border) bg-(--pill-plum-bg)',
  sage: 'border-(--pill-sage-border) bg-(--pill-sage-bg)',
  gold: 'border-(--pill-gold-border) bg-(--pill-gold-bg)',
  sky: 'border-(--pill-sky-border) bg-(--pill-sky-bg)',
  neutral: 'border-(--pill-neutral-border) bg-(--pill-neutral-bg)',
  blush: 'border-(--pill-blush-border) bg-(--pill-blush-bg)',
};

/** The dot beside a category's name: the tone's text colour, which has 7:1 contrast. */
export const accentDotClasses: Record<PillTone, string> = {
  plum: 'bg-(--pill-plum-text)',
  sage: 'bg-(--pill-sage-text)',
  gold: 'bg-(--pill-gold-text)',
  sky: 'bg-(--pill-sky-text)',
  neutral: 'bg-(--pill-neutral-text)',
  blush: 'bg-(--pill-blush-text)',
};
