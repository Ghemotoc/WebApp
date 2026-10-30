/**
 * The tag catalogue: every approved tag with its name in each language, and the two things the
 * app does with it (CMS-1e; Robert, 30 Oct 2026, 10:48).
 *
 * - Show a tag in the interface language: a story's tags arrive as their stored names ("Fantasy",
 *   or a writer's own spelling); nameIn() finds the tag and gives its name in Romanian, English or
 *   any language staff named it in, falling back to the stored name.
 * - Recognise a name typed in another language: with the interface in English, a writer who types
 *   "fantezie" gets "Fantasy". The database does the same when it saves (tag_for_name()), so a
 *   name the app doesn't know yet still lands on the right tag.
 * Who calls it: hooks/useTagCatalogue.ts. What it calls: normaliseTag(), the same rule as the
 * database's normalise_tag().
 */
import { normaliseTag } from '@/features/writing/lib/tags';

/** One approved tag. */
export interface CatalogueTag {
  /** The stored name, as story pages send it. */
  storedName: string;
  /** Shown as a suggestion under the tag box. */
  isRecommended: boolean;
  /** Its name in each language, by BCP 47 code: {"ro": "Fantezie", "en": "Fantasy"}. */
  names: Record<string, string>;
}

/**
 * The base language of a BCP 47 code ("en-GB" → "en").
 *
 * @param language - the interface language
 * @returns its first part
 */
function baseLanguageOf(language: string): string {
  return language.split('-')[0] ?? language;
}

/**
 * A tag's name in a language: the exact code, then its base language, then the stored name.
 *
 * @param tag - the tag
 * @param language - the interface language
 * @returns the name to show
 */
export function tagNameIn(tag: CatalogueTag, language: string): string {
  return tag.names[language] ?? tag.names[baseLanguageOf(language)] ?? tag.storedName;
}

/**
 * Finds the tag a name stands for: its stored name or its name in any language, ignoring case,
 * spaces and diacritics.
 *
 * @param catalogue - the approved tags
 * @param typedName - a stored or typed name
 * @returns the tag, or undefined when it is new or still waiting for staff
 */
export function findTag(catalogue: CatalogueTag[], typedName: string): CatalogueTag | undefined {
  const wanted = normaliseTag(typedName);
  if (wanted === '') return undefined;
  return catalogue.find(
    (tag) =>
      normaliseTag(tag.storedName) === wanted ||
      Object.values(tag.names).some((name) => normaliseTag(name) === wanted),
  );
}

/**
 * The name to show for a tag, in the interface language.
 *
 * @param catalogue - the approved tags
 * @param storedOrTypedName - the name a story page or a writer gave
 * @param language - the interface language
 * @returns the tag's name in that language, or the name as given when the tag isn't approved
 */
export function nameIn(
  catalogue: CatalogueTag[],
  storedOrTypedName: string,
  language: string,
): string {
  const tag = findTag(catalogue, storedOrTypedName);
  return tag === undefined ? storedOrTypedName : tagNameIn(tag, language);
}
