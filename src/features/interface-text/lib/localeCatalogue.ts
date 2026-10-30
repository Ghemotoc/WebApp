/**
 * The catalogue of every interface text key, read from the bundled locale files (story S1-E11-18
 * criterion 1).
 *
 * Keys exist only in the files (decided 17 Oct 2026, 19:16), so the editor lists what the files
 * hold: every string of every namespace, in Romanian and English. Plural forms (i18next's "_one",
 * "_few", "_other") are their own keys, so each is its own row (criterion 3).
 * Who calls it: the Interface text and Email templates tabs (staff only; this file is in the staff
 * chunk, so the reader never downloads every locale file).
 */

/** One key with its file text in each language. */
export interface CatalogueEntry {
  /** "common:nav.help". */
  textKey: string;
  namespace: string;
  /** "nav.help". */
  path: string;
  /** The file text by language code. */
  fileTexts: Record<string, string>;
}

/** A locale file's content: nested objects of strings. */
type LocaleTree = { [key: string]: string | LocaleTree };

/** Every bundled locale file, by its path ("/src/locales/en/common.json"). */
const localeFiles = import.meta.glob<LocaleTree>('/src/locales/*/*.json', {
  eager: true,
  import: 'default',
});

/**
 * Flattens one file into "path → text" pairs.
 *
 * @param tree - the file's content
 * @param prefix - the path so far
 * @param into - where the pairs go
 */
function flatten(tree: LocaleTree, prefix: string, into: Map<string, string>): void {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') into.set(path, value);
    else flatten(value, path, into);
  }
}

/**
 * Builds the catalogue from the files the app bundles.
 *
 * @param files - the files by path (the bundled ones; tests pass their own)
 * @returns every key, sorted by namespace and path
 */
export function buildCatalogue(files: Record<string, LocaleTree> = localeFiles): CatalogueEntry[] {
  const entries = new Map<string, CatalogueEntry>();
  for (const [filePath, tree] of Object.entries(files)) {
    // Step 1: "/src/locales/en/common.json" → language "en", namespace "common".
    const match = /\/locales\/([^/]+)\/([^/]+)\.json$/.exec(filePath);
    if (match === null) continue;
    const [, language = '', namespace = ''] = match;
    // Step 2: one entry per key, holding the text of each language.
    const texts = new Map<string, string>();
    flatten(tree, '', texts);
    for (const [path, text] of texts) {
      const textKey = `${namespace}:${path}`;
      const entry = entries.get(textKey) ?? { textKey, namespace, path, fileTexts: {} };
      entry.fileTexts[language] = text;
      entries.set(textKey, entry);
    }
  }
  return [...entries.values()].sort((first, second) => first.textKey.localeCompare(second.textKey));
}

/**
 * Finds keys by the words on screen (in any language) or by the key itself.
 *
 * @param catalogue - every key
 * @param search - what the admin typed
 * @returns the matching keys
 */
export function searchCatalogue(catalogue: CatalogueEntry[], search: string): CatalogueEntry[] {
  const wanted = search.trim().toLocaleLowerCase();
  if (wanted === '') return catalogue;
  return catalogue.filter(
    (entry) =>
      entry.textKey.toLocaleLowerCase().includes(wanted) ||
      Object.values(entry.fileTexts).some((text) => text.toLocaleLowerCase().includes(wanted)),
  );
}

/** Namespaces and words that mark legal wording (S1-E11-18 criterion 11). */
const legalNamespaces = new Set(['legal', 'statements', 'reporting', 'notices']);
const legalWords = ['age', 'consent', 'privacy', 'report', 'message', 'parent', 'birth'];

/**
 * Says whether a key is legal wording: about age, consent, privacy, reporting or messaging rules.
 *
 * @param entry - the key
 * @returns true when the editor should remind the admin to match the legal documents
 */
export function isLegalWording(entry: CatalogueEntry): boolean {
  if (legalNamespaces.has(entry.namespace)) return true;
  const path = entry.path.toLocaleLowerCase();
  return legalWords.some((word) => path.includes(word));
}

/**
 * The {{placeholders}} in a text, sorted and without repeats, as the database reads them
 * (text_placeholders() in …_s1_e11_18_interface_text.sql).
 *
 * @param text - a text
 * @returns the names, for example ["count", "productName"]
 */
export function placeholdersOf(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([a-zA-Z0-9_.]+)[^}]*\}\}/g)) {
    if (match[1] !== undefined) names.add(match[1]);
  }
  return [...names].sort();
}
