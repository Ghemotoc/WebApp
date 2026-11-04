/**
 * The words of "Why this ad?" (bundle SPONSORS, part a1; story S1-E12-01 criterion 3; board
 * AdFormats, "Banner after a chapter").
 *
 * The answer always says the same two things: what about the page the ad matches (its category,
 * tag and language, as page_ads() returned them) and that nothing about the reader was used.
 * Who calls it: components/AdBox.tsx.
 */
import type { TFunction } from 'i18next';

import type { PageAdSlot } from '@/schemas/ads';

/**
 * A language code in the reader's language ("ro" → "Romanian" in English), or the code itself
 * when the browser can't name it.
 *
 * @param code - the page's language code
 * @param readerLanguage - the interface language
 * @returns the language's name
 */
export function languageName(code: string, readerLanguage: string): string {
  try {
    const names = new Intl.DisplayNames([readerLanguage], { type: 'language' });
    return names.of(code) ?? code;
  } catch {
    // An unknown code or an old browser: the code is still true, just less friendly.
    return code;
  }
}

/**
 * The list of what the ad matched, for example "category fiction, tag mystery, language English".
 *
 * @param t - the ads translation function
 * @param matched - what page_ads() says the choice could use
 * @param readerLanguage - the interface language, to name the page's language
 * @returns the list, or an empty string when the page sent nothing
 */
export function matchedPageParts(
  t: TFunction,
  matched: PageAdSlot['matched'],
  readerLanguage: string,
): string {
  const parts: string[] = [];
  // Each part only when the page gave it; the order is the board's.
  if (matched.category !== undefined) {
    // The page sends the category's address; its name comes from the writing words, and the
    // address itself is shown if a category is newer than the locale files.
    const categoryName = t(`categories.${matched.category}`, {
      ns: 'writing',
      defaultValue: matched.category,
    });
    parts.push(t('why.category', { name: categoryName }));
  }
  if (matched.tag !== undefined) parts.push(t('why.tag', { name: matched.tag }));
  if (matched.language !== undefined) {
    parts.push(t('why.language', { name: languageName(matched.language, readerLanguage) }));
  }
  return parts.join(', ');
}

/**
 * The first sentence: who placed the ad, or nothing for a kind that doesn't say.
 *
 * @param t - the ads translation function
 * @param ad - the slot's ad
 * @returns the sentence with a space after it, or an empty string
 */
function whoPlacedIt(t: TFunction, ad: PageAdSlot['ad']): string {
  if (ad?.label === 'house') return `${t('why.ours')} `;
  if (ad?.label === 'sponsored') return `${t('why.sponsored', { name: ad.sponsor_name ?? '' })} `;
  return '';
}

/**
 * The whole explanation.
 *
 * @param t - the ads translation function
 * @param slot - the slot, with its label and what it matched
 * @param readerLanguage - the interface language
 * @returns two or three sentences: who placed it, what it matches, and the promise
 */
export function whyThisAd(t: TFunction, slot: PageAdSlot, readerLanguage: string): string {
  const parts = matchedPageParts(t, slot.matched, readerLanguage);
  // Who placed it comes first: our own pages, or a named sponsor (part b3); the network comes in
  // part d.
  const who = whoPlacedIt(t, slot.ad);
  const matches = parts === '' ? t('why.matchesPage') : t('why.matchesParts', { parts });
  return `${who}${matches} ${t('why.promise')}`;
}
