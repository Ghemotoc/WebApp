/**
 * The translation check behind `npm run i18n:check` (story S1-E1-01; S1-E1-04 builds on it).
 *
 * Who runs it: you, and CI on every pull request. It exits with code 1 when something is wrong.
 * What it reads: every JSON file in src/locales/ro/ and src/locales/en/.
 * What it checks:
 * 1. Every key exists in both languages (CLAUDE.md rule 4: add keys to both ro and en).
 * 2. Romanian text uses the comma-below letters ș and ț, never the cedilla look-alikes ş and ţ
 *    (CLAUDE.md rule 4). Added here because a wrong letter is easy to paste and hard to see. It uses
 *    the same rule as the app's text fields, src/lib/romanian-text.ts (S1-E1-04): a text is wrong
 *    when correcting its letters would change it.
 * 3. The Nordic folders (src/locales/sv/, da/, nb/; bundle MARKETS-2, part a). A folder may hold
 *    only some files and some keys while it is being translated: what is missing reads in English,
 *    so it is reported as a warning, never a failure. A key English doesn't have is a failure (a
 *    typo, or a key renamed in English and not here). A language listed in
 *    requiredFullLanguages must be complete: its missing keys fail the check. Add a language there
 *    in the pull request that lands its last file, before staff open it in Staff › Settings
 *    (the brief: "missing keys for closed languages as warnings and for open languages as errors";
 *    the check can't read the database, so this list stands in for "open").
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { normaliseRomanianLetters } from '../src/lib/romanian-text';

/** The languages that must have the same keys. */
export const localeLanguages = ['ro', 'en'] as const;

/** The Nordic folders the check reads, when they exist (MARKETS-2a). */
export const nordicLanguages = ['sv', 'da', 'nb'] as const;

/**
 * Nordic languages that must be complete: every English key translated. Empty until the first
 * Nordic language is fully translated; add its code in the same pull request.
 */
export const requiredFullLanguages: readonly string[] = [];

/** A translation file's contents: text values, possibly grouped in nested objects. */
export interface TranslationTree {
  [key: string]: string | TranslationTree;
}

/** One problem the check found, written so a non-developer can act on it. */
export type TranslationProblem = string;

/**
 * Turns nested translations into a flat map of dotted keys, for example { "home.welcome": "..." }.
 *
 * @param tree - the parsed JSON file
 * @param prefix - the key path so far (used when walking into nested groups)
 * @returns every text value by its full key
 */
export function flattenTranslations(tree: TranslationTree, prefix = ''): Map<string, string> {
  const flatTranslations = new Map<string, string>();

  for (const [key, value] of Object.entries(tree)) {
    const fullKey = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      flatTranslations.set(fullKey, value);
      continue;
    }
    // A nested group: add all of its keys under this key's path.
    for (const [nestedKey, nestedValue] of flattenTranslations(value, fullKey)) {
      flatTranslations.set(nestedKey, nestedValue);
    }
  }

  return flatTranslations;
}

/**
 * Lists keys that exist in one language's file but not the other's.
 *
 * @param namespace - the file name without .json, for example "common"
 * @param romanian - the flattened Romanian file
 * @param english - the flattened English file
 * @returns one problem per missing key
 */
export function findMissingKeys(
  namespace: string,
  romanian: Map<string, string>,
  english: Map<string, string>,
): TranslationProblem[] {
  const problems: TranslationProblem[] = [];

  // Keys in Romanian with no English text, then the other way round.
  for (const key of romanian.keys()) {
    if (!english.has(key)) problems.push(`${namespace}.json: "${key}" is missing in en`);
  }
  for (const key of english.keys()) {
    if (!romanian.has(key)) problems.push(`${namespace}.json: "${key}" is missing in ro`);
  }

  return problems;
}

/**
 * Lists Romanian texts that use a cedilla letter instead of ș or ț.
 *
 * @param namespace - the file name without .json
 * @param romanian - the flattened Romanian file
 * @returns one problem per text with a cedilla letter
 */
export function findCedillaLetters(
  namespace: string,
  romanian: Map<string, string>,
): TranslationProblem[] {
  return [...romanian.entries()]
    .filter(([, text]) => normaliseRomanianLetters(text) !== text)
    .map(([key]) => `${namespace}.json: "${key}" uses ş or ţ; use ș or ț (comma below)`);
}

/**
 * Reads one language's translation files.
 *
 * @param localesFolder - absolute path of src/locales
 * @param language - "ro" or "en"
 * @returns each namespace with its flattened translations
 * Errors: throws if a file is not valid JSON, naming the file.
 */
function readLanguage(localesFolder: string, language: string): Map<string, Map<string, string>> {
  const namespaces = new Map<string, Map<string, string>>();
  const languageFolder = join(localesFolder, language);

  for (const fileName of readdirSync(languageFolder).filter((name) => name.endsWith('.json'))) {
    const filePath = join(languageFolder, fileName);
    try {
      const tree = JSON.parse(readFileSync(filePath, 'utf8')) as TranslationTree;
      namespaces.set(fileName.replace(/\.json$/, ''), flattenTranslations(tree));
    } catch (error) {
      throw new Error(`${language}/${fileName} is not valid JSON: ${String(error)}`);
    }
  }

  return namespaces;
}

/**
 * Runs every check on the locale folder.
 *
 * @param localesFolder - absolute path of src/locales
 * @returns every problem found; an empty list means the translations are complete
 */
export function checkLocales(localesFolder: string): TranslationProblem[] {
  const romanianFiles = readLanguage(localesFolder, 'ro');
  const englishFiles = readLanguage(localesFolder, 'en');
  const namespaceNames = new Set([...romanianFiles.keys(), ...englishFiles.keys()]);
  const problems: TranslationProblem[] = [];

  // For each file name in either language: it must exist in both, with the same keys.
  for (const namespace of namespaceNames) {
    const romanian = romanianFiles.get(namespace);
    const english = englishFiles.get(namespace);
    if (romanian === undefined || english === undefined) {
      problems.push(`${namespace}.json exists in only one of ro and en`);
      continue;
    }
    problems.push(...findMissingKeys(namespace, romanian, english));
    problems.push(...findCedillaLetters(namespace, romanian));
  }

  return problems;
}

/** What the Nordic check found: failures, and warnings that don't fail the build. */
export interface NordicFindings {
  problems: TranslationProblem[];
  warnings: string[];
}

/**
 * Compares one Nordic language with English (check 3).
 *
 * @param language - "sv", "da" or "nb"
 * @param nordicFiles - that language's flattened files
 * @param englishFiles - English's flattened files
 * @returns failures (keys English doesn't have; missing keys in a required language) and warnings
 */
export function compareNordicLanguage(
  language: string,
  nordicFiles: Map<string, Map<string, string>>,
  englishFiles: Map<string, Map<string, string>>,
): NordicFindings {
  const findings: NordicFindings = { problems: [], warnings: [] };
  const isRequired = requiredFullLanguages.includes(language);
  for (const [namespace, english] of englishFiles) {
    // Step 1: count the English keys this language hasn't translated yet.
    const nordic = nordicFiles.get(namespace) ?? new Map<string, string>();
    const missing = [...english.keys()].filter((key) => !nordic.has(key));
    if (missing.length > 0) {
      const line = `${language}/${namespace}.json: ${missing.length} of ${english.size} keys not translated yet (they read in English)`;
      if (isRequired) findings.problems.push(line);
      else findings.warnings.push(line);
    }
  }
  for (const [namespace, nordic] of nordicFiles) {
    // Step 2: a key English doesn't have is always a mistake.
    const english = englishFiles.get(namespace) ?? new Map<string, string>();
    for (const key of nordic.keys()) {
      if (!english.has(key))
        findings.problems.push(`${language}/${namespace}.json has "${key}", which en doesn't`);
    }
  }
  return findings;
}

/**
 * Runs check 3 on every Nordic folder that exists.
 *
 * @param localesFolder - absolute path of src/locales
 * @returns the failures and warnings for all three languages
 */
export function checkNordicLocales(localesFolder: string): NordicFindings {
  const englishFiles = readLanguage(localesFolder, 'en');
  const findings: NordicFindings = { problems: [], warnings: [] };
  for (const language of nordicLanguages) {
    // A language with no folder at all hasn't started: nothing to say, unless it must be complete.
    const nordicFiles = existsSync(join(localesFolder, language))
      ? readLanguage(localesFolder, language)
      : new Map<string, Map<string, string>>();
    if (nordicFiles.size === 0 && !requiredFullLanguages.includes(language)) continue;
    const languageFindings = compareNordicLanguage(language, nordicFiles, englishFiles);
    findings.problems.push(...languageFindings.problems);
    findings.warnings.push(...languageFindings.warnings);
  }
  return findings;
}

/** Runs the check from the command line and sets the exit code CI reads. */
function main(): void {
  const localesFolder = fileURLToPath(new URL('../src/locales', import.meta.url));
  const nordic = checkNordicLocales(localesFolder);
  const problems = [...checkLocales(localesFolder), ...nordic.problems];

  // Warnings first: they never fail the build, but a translator wants to see them.
  for (const warning of nordic.warnings) console.warn(`warning: ${warning}`);
  if (problems.length === 0) {
    console.log('i18n check passed: ro and en have the same keys and Romanian uses ș and ț.');
    return;
  }
  console.error(`i18n check failed with ${problems.length} problem(s):`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exitCode = 1;
}

// Run main() only when this file is started directly, not when a test imports it.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
