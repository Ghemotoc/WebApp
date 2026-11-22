/**
 * Loads the English interface text only when someone reads in English (the reader speed fix;
 * Builder queue, 21 Nov 2026: "load only the active language").
 *
 * Why: every page used to download the Romanian AND the English text files on its first load,
 * about 170 KB before gzip, while a reader only ever sees one language at a time. Romanian stays
 * bundled, because it is everyone's first language (decided 17 Oct 2026, 11:48) and the fallback
 * for a missing key. English is split into its own files and arrives:
 *   - before the first screen, when this browser last chose English (main.tsx awaits
 *     loadInterfaceLanguage());
 *   - when someone switches to English later: loadEnglishBeforeSwitching() makes changeLanguage()
 *     download the files first and finish once they are in, so no screen shows half one language.
 * Tests register English up front (src/test/setup.ts calls registerPreloadedLanguage()), so a
 * test can still make an English instance at once.
 * Who uses it: src/lib/i18n.ts (createI18n reads the registry and wraps changeLanguage) and
 * src/main.tsx. What it calls: Vite's import.meta.glob, which turns each file into its own chunk.
 */
import type { i18n as I18nInstance, ResourceLanguage } from 'i18next';

/** The namespaces every page needs; the rest load with their screens (namespace-translations). */
export const eagerNamespaces = [
  'common',
  'legal',
  'auth',
  'account',
  'writing',
  'reading',
] as const;

/** The English files, each a chunk of its own that downloads only when asked for. */
const englishFiles = import.meta.glob<{ default: Record<string, unknown> }>(
  '../locales/en/{common,legal,auth,account,writing,reading}.json',
);

/** Languages whose files are already here, by language code (filled by tests and by loading). */
const preloadedLanguages: Record<string, ResourceLanguage> = {};

/**
 * Remembers a language's text so every instance made afterwards has it at once.
 *
 * @param language - the language code, for example "en"
 * @param resources - its namespaces, for example { common: {...}, reading: {...} }
 */
export function registerPreloadedLanguage(language: string, resources: ResourceLanguage): void {
  preloadedLanguages[language] = { ...preloadedLanguages[language], ...resources };
}

/**
 * The languages registered so far, for createI18n's starting resources.
 *
 * @returns a copy per language, so one instance adding or removing a namespace never changes what
 *   the next instance starts with (the namespace texts themselves are shared, never copied deeply)
 */
export function preloadedResources(): Record<string, ResourceLanguage> {
  const copy: Record<string, ResourceLanguage> = {};
  for (const [language, resources] of Object.entries(preloadedLanguages)) {
    copy[language] = { ...resources };
  }
  return copy;
}

/**
 * Loads one English namespace file.
 *
 * @param namespace - the namespace, for example "reading"
 * @returns its text, or null when the namespace has no English file to load here
 * Errors: a failed download rejects, so the caller can report it.
 */
async function loadEnglishNamespace(namespace: string): Promise<Record<string, unknown> | null> {
  const loader = englishFiles[`../locales/en/${namespace}.json`];
  if (loader === undefined) return null;
  const file = await loader();
  return file.default;
}

/**
 * Makes sure a language's eager namespaces are here before the first screen draws.
 *
 * @param language - the language the app starts in
 * @returns once the files are in (at once for Romanian, which is bundled). Swedish, Danish and
 *   Norwegian need English too, because their missing keys fall back to it (MARKETS-2a).
 * Errors: a failed download rejects; main.tsx then starts in Romanian rather than show nothing.
 */
export async function loadInterfaceLanguage(language: string): Promise<void> {
  // Step 1: Romanian is bundled, and English loaded before needs nothing more.
  if (language === 'ro' || preloadedLanguages.en !== undefined) return;
  // Step 2: download the English files side by side, then keep them for every instance.
  const texts = await Promise.all(eagerNamespaces.map((name) => loadEnglishNamespace(name)));
  const resources: ResourceLanguage = {};
  eagerNamespaces.forEach((name, index) => {
    const text = texts[index];
    if (text !== null && text !== undefined) resources[name] = text;
  });
  registerPreloadedLanguage('en', resources);
}

/**
 * Adds the English text to one instance, after downloading it if this is the first time.
 *
 * @param instance - the translation instance about to switch language
 * @returns once every eager English namespace is in the instance
 * Errors: a failed download rejects, and the instance keeps the language it had.
 */
async function addEnglishTo(instance: I18nInstance): Promise<void> {
  // Step 1: download the files once per visit (at once when they are here already).
  await loadInterfaceLanguage('en');
  // Step 2: add each namespace this instance doesn't have yet. Deep, without overwriting, so a
  // feature's own English text and the admins' overrides stay as they are.
  for (const [namespace, text] of Object.entries(preloadedLanguages.en ?? {})) {
    if (!instance.hasResourceBundle('en', namespace)) {
      instance.addResourceBundle('en', namespace, text, true, false);
    }
  }
}

/**
 * Makes an instance's changeLanguage() fetch English before it switches, so every caller (the
 * language menu, the account's language, the website's address) gets the whole language at once
 * and no screen shows half one language. Romanian needs nothing; Swedish, Danish and Norwegian
 * need English, because their missing keys fall back to it (MARKETS-2a).
 *
 * Why not an i18next backend: with one, i18next counts every bundled namespace a feature adds
 * later (namespace-translations) as "not loaded yet", and those screens would show their keys.
 *
 * @param instance - the instance createI18n just made
 */
export function loadEnglishBeforeSwitching(instance: I18nInstance): void {
  const switchLanguage = instance.changeLanguage.bind(instance);
  instance.changeLanguage = async (language, callback) => {
    if (language !== undefined && language !== 'ro') await addEnglishTo(instance);
    return switchLanguage(language, callback);
  };
}
