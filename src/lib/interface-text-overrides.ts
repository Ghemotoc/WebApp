/**
 * Lays the admins' interface text overrides over the ro and en locale files (story S1-E11-18;
 * architecture 1.8.6, B34).
 *
 * How it works: the locale files are bundled and show at once. In the background this fetches the
 * published overrides for the current language once per visit (published_interface_text()) and
 * writes each one over the file text of the same key. It never blocks the first screen, and if the
 * read fails the file text simply stays (criterion 9). Namespaces that load later, when a page
 * opens (the register*Translations helpers), get their overrides as soon as they are added.
 * An override for a key the files no longer have is ignored: keys exist only in the files
 * (criterion 10).
 * Who calls it: src/main.tsx, once, right after the translations start.
 * What it calls next: getSupabaseClient() and published_interface_text() in
 * …_s1_e11_18_interface_text.sql.
 */
import type { i18n as I18nInstance } from 'i18next';

import { getSupabaseClient } from './supabase';

/** One override: "common:nav.help" and its text. */
export interface InterfaceTextOverride {
  textKey: string;
  text: string;
}

/** Reads the published overrides of one locale. */
export type OverrideLoader = (locale: string) => Promise<InterfaceTextOverride[]>;

/**
 * Reads the published overrides of one locale from the database.
 *
 * @param locale - "ro" or "en"
 * @returns the overrides; an empty list when there is no database to ask
 * Errors: rejects when the read fails, so the caller keeps the file text.
 */
export async function loadPublishedOverrides(locale: string): Promise<InterfaceTextOverride[]> {
  const client = await getSupabaseClient();
  if (client === null) return [];
  const { data, error } = await client.rpc('published_interface_text', { wanted_locale: locale });
  if (error !== null)
    throw new Error(`Couldn't read the interface text overrides: ${error.message}`);
  return data.map((row) => ({ textKey: row.text_key, text: row.text }));
}

/**
 * Splits "common:nav.help" into its namespace and path.
 *
 * @param textKey - the key with its namespace
 * @returns the namespace and the path inside it, or null when the key has no namespace
 */
export function splitTextKey(textKey: string): { namespace: string; path: string } | null {
  const colon = textKey.indexOf(':');
  if (colon <= 0) return null;
  return { namespace: textKey.slice(0, colon), path: textKey.slice(colon + 1) };
}

/**
 * Writes one locale's overrides for one namespace over the file text.
 *
 * @param instance - the translation instance
 * @param locale - the locale the overrides are for
 * @param namespace - the namespace just loaded, or null for every namespace loaded so far
 * @param overrides - the locale's overrides
 * @returns how many were written
 */
function applyOverrides(
  instance: I18nInstance,
  locale: string,
  namespace: string | null,
  overrides: InterfaceTextOverride[],
): number {
  let written = 0;
  for (const override of overrides) {
    const place = splitTextKey(override.textKey);
    if (place === null) continue;
    if (namespace !== null && place.namespace !== namespace) continue;
    // Only keys the file has: the files decide which keys exist (S1-E11-18 criterion 10).
    if (typeof instance.getResource(locale, place.namespace, place.path) !== 'string') continue;
    // Silent, so this write doesn't announce itself as a new namespace being added.
    instance.addResource(locale, place.namespace, place.path, override.text, { silent: true });
    written += 1;
  }
  return written;
}

/**
 * Starts laying overrides over the locale files for the current language and every language the
 * person switches to.
 *
 * @param instance - the app's translation instance
 * @param loadOverrides - where the overrides come from (the database; a fake in tests)
 */
export function installInterfaceTextOverrides(
  instance: I18nInstance,
  loadOverrides: OverrideLoader = loadPublishedOverrides,
): void {
  // The overrides fetched so far, by locale; a locale is fetched once per visit.
  const fetched = new Map<string, InterfaceTextOverride[]>();
  const asked = new Set<string>();

  // Step 1: fetch a locale's overrides once, write them over what is loaded, then redraw.
  const fetchLocale = (locale: string) => {
    if (asked.has(locale)) return;
    asked.add(locale);
    loadOverrides(locale)
      .then((overrides) => {
        fetched.set(locale, overrides);
        const written = applyOverrides(instance, locale, null, overrides);
        // Asking for the same language again makes every screen draw its text afresh.
        if (written > 0 && instance.language === locale) void instance.changeLanguage(locale);
      })
      .catch(() => {
        // The file text stays and the app keeps working; the next visit tries again.
        asked.delete(locale);
      });
  };

  // Step 2: a namespace that loads later gets its overrides as soon as it is added.
  instance.store.on('added', (locale: string, namespace: string) => {
    const overrides = fetched.get(locale);
    if (overrides !== undefined) applyOverrides(instance, locale, namespace, overrides);
  });

  // Step 3: the current language now, and each language the person switches to.
  instance.on('languageChanged', fetchLocale);
  fetchLocale(instance.language);
}

/**
 * Writes one locale's published overrides for one namespace now, for text made in a language
 * other than the screen's: the EPUB's book words follow the story's language (story S1-E13-05,
 * PRIVACY part f), and staff edits to them must show there too.
 *
 * @param instance - the app's translation instance
 * @param locale - the book's language ("ro" or "en")
 * @param namespace - the namespace whose keys to write ("dataExport")
 * @param loadOverrides - where the overrides come from (the database; a fake in tests)
 * Errors: none; if the read fails the file text stays, and a warning says so.
 */
export async function applyLocaleOverrides(
  instance: I18nInstance,
  locale: string,
  namespace: string,
  loadOverrides: OverrideLoader = loadPublishedOverrides,
): Promise<void> {
  try {
    applyOverrides(instance, locale, namespace, await loadOverrides(locale));
  } catch (error) {
    console.warn(`The ${locale} interface text overrides couldn't be read: ${String(error)}`);
  }
}
