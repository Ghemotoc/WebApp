/**
 * listBackgrounds: small helpers for Staff › Website › Genre and tag pages (bundle G12b).
 *
 * Who calls it: ListBackgroundsTab and ListBackgroundRows.
 */
import type { TFunction } from 'i18next';

import type { PillTone } from '@/components/ui/InfoPill';
import { categoryAccent } from '@/features/discovery/lib/categoryAccents';

import type { BackgroundPlace, ListBackground } from '../api/staff/listPageBackgrounds';

/**
 * The page's name as visitors see it: the genre's name, or the tag with its hash.
 *
 * @param place - the genre or tag
 * @param t - any translator (the genre names are in the writing namespace)
 * @returns for example "Poetry" or "#Fantasy"
 */
export function pageNameFor(place: Pick<BackgroundPlace, 'kind' | 'key'>, t: TFunction): string {
  if (place.kind === 'category') return t(`categories.${place.key}`, { ns: 'writing' });
  return `#${place.key}`;
}

/**
 * The colour a page shows now in a market: the admin's choice, or the default (a genre's own
 * accent; plum for a tag, which has no band until one is chosen).
 *
 * @param place - the genre or tag
 * @param inMarket - the choices saved for that market
 * @returns the colour to start the editor on
 */
export function startToneFor(
  place: Pick<BackgroundPlace, 'kind' | 'key'>,
  inMarket: readonly ListBackground[],
): PillTone {
  const chosen = inMarket.find((row) => row.kind === place.kind && row.key === place.key);
  if (chosen !== undefined) return chosen.palette;
  return place.kind === 'category' ? categoryAccent(place.key) : 'plum';
}
