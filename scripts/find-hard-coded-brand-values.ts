/**
 * Finds the product name, site domain, email addresses or social handle typed anywhere they
 * shouldn't be (story S1-E1-01; decided 17 Oct 2026, 12:47: names are settings, not code).
 *
 * Who calls it: scripts/find-hard-coded-brand-values.test.ts, which runs in `npm test` and so in CI.
 * What it reads: every file under src/, supabase/, public/ and e2e/, plus index.html.
 * Allowed places: src/config/brand.ts (the one brand config) and src/locales/ (the translations).
 * The search ignores letter case (Robert, 17 Oct 2026), so "GHEMOTOC", "ghemotoc.com" and
 * "ghemotoc.themagiccoffin.com" are all caught.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { brand, brandDefaults } from '../src/config/brand';

/** Folders and files that must not contain a brand value. Paths are relative to the repository. */
export const scannedPaths = ['src', 'supabase', 'public', 'e2e', 'index.html'];

/** The only places a brand value may appear. A path ending in "/" allows the whole folder. */
export const allowedPaths = ['src/config/brand.ts', 'src/locales/'];

/** Folders inside the scanned paths that hold tool output, not our code. */
const ignoredFolderNames = new Set(['node_modules', '.temp', '.branches']);

/** One place a brand value was found. */
export interface BrandValueFinding {
  /** File path relative to the repository, with "/" separators. */
  filePath: string;
  /** Line number, starting at 1. */
  lineNumber: number;
  /** The brand value that was found, as written in the brand config. */
  value: string;
}

/**
 * The values to look for: today's defaults and whatever the current environment overrides them with.
 * Both are checked, so a rename can't hide the old name left behind in code.
 *
 * @returns unique values in lower case
 */
export function forbiddenBrandValues(): string[] {
  const candidates = [
    brandDefaults.productName,
    brandDefaults.siteDomain,
    brandDefaults.contactEmail,
    brandDefaults.supportEmail,
    brandDefaults.privacyEmail,
    brandDefaults.socialHandle,
    brandDefaults.companyName,
    brand.productName,
    brand.siteDomain,
    brand.contactEmail,
    brand.supportEmail,
    brand.privacyEmail,
    brand.socialHandle,
    brand.companyName,
  ];
  return [...new Set(candidates.map((value) => value.toLowerCase()))];
}

/**
 * Looks for brand values in one piece of text.
 *
 * @param text - the file's contents
 * @param filePath - used only to label the findings
 * @param values - the lower-case values to look for, from forbiddenBrandValues()
 * @returns one finding per line and value
 */
export function findBrandValuesInText(
  text: string,
  filePath: string,
  values: string[],
): BrandValueFinding[] {
  const findings: BrandValueFinding[] = [];
  const lines = text.split('\n');

  // Check each line against each value, ignoring letter case.
  lines.forEach((line, index) => {
    const lowerCaseLine = line.toLowerCase();
    for (const value of values) {
      if (lowerCaseLine.includes(value)) {
        findings.push({ filePath, lineNumber: index + 1, value });
      }
    }
  });

  return findings;
}

/**
 * Says whether a file is one of the allowed places for brand values.
 *
 * @param filePath - relative path with "/" separators
 * @returns true for src/config/brand.ts and anything under src/locales/
 */
export function isAllowedPath(filePath: string): boolean {
  return allowedPaths.some((allowedPath) =>
    allowedPath.endsWith('/') ? filePath.startsWith(allowedPath) : filePath === allowedPath,
  );
}

/**
 * Lists every file under a path, skipping tool output folders.
 *
 * @param absolutePath - a file or folder on disk
 * @returns absolute file paths; an empty list when the path doesn't exist yet
 */
function listFiles(absolutePath: string): string[] {
  // A scanned folder may not exist yet (for example e2e/ in a fresh clone); that's not an error.
  let stats;
  try {
    stats = statSync(absolutePath);
  } catch {
    return [];
  }
  if (stats.isFile()) {
    return [absolutePath];
  }

  // A folder: walk into each entry except the ignored ones.
  return readdirSync(absolutePath)
    .filter((entryName) => !ignoredFolderNames.has(entryName))
    .flatMap((entryName) => listFiles(join(absolutePath, entryName)));
}

/**
 * Scans the repository for brand values outside the allowed places.
 *
 * @param repositoryRoot - absolute path of the repository
 * @returns every finding; an empty list means the rule holds
 */
export function findHardCodedBrandValues(repositoryRoot: string): BrandValueFinding[] {
  const values = forbiddenBrandValues();

  // Collect every file in the scanned paths, as repository-relative paths with "/" separators.
  const filePaths = scannedPaths
    .flatMap((scannedPath) => listFiles(join(repositoryRoot, scannedPath)))
    .map((absolutePath) => relative(repositoryRoot, absolutePath).split(sep).join('/'));

  // Search each file that isn't an allowed place.
  return filePaths
    .filter((filePath) => !isAllowedPath(filePath))
    .flatMap((filePath) =>
      findBrandValuesInText(readFileSync(join(repositoryRoot, filePath), 'utf8'), filePath, values),
    );
}
