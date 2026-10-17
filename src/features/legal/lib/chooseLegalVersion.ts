/**
 * Chooses which version and language of a legal document to show (story S1-E14-01).
 *
 * Who calls it: LegalCentrePage, with the versions useLegalVersions loaded.
 * Rules:
 * - The current version is the newest live one (every language of a version shares its time).
 * - It is shown in the interface language when that text exists, otherwise in English, and the
 *   page then says the text isn't available in the reader's language yet.
 * - The history lists every version once, newest first, with the languages it exists in, because
 *   "older versions stay on this page, in Romanian and English" (terms, section 8).
 */
import type { LegalVersion } from '../api/legalDocuments';

/** The language shown when the reader's language has no text (the drafts are written in English). */
const fallbackLanguage = 'en';

/** One version in the history list. */
export interface LegalVersionSummary {
  versionLabel: string;
  publishedAt: string;
  languages: string[];
  isLawyerReviewed: boolean;
}

/** What the page shows. */
export interface ChosenLegalVersion {
  /** The text to show; null when the document has no live version at all. */
  current: LegalVersion | null;
  /** True when the reader's language had no text and the fallback is shown instead. */
  isFallbackLanguage: boolean;
  history: LegalVersionSummary[];
}

/**
 * Groups the versions by label, newest first.
 *
 * @param versions - every live version, newest first, any language
 * @returns one summary per version label
 */
function summariseHistory(versions: LegalVersion[]): LegalVersionSummary[] {
  const byLabel = new Map<string, LegalVersionSummary>();
  for (const version of versions) {
    const summary = byLabel.get(version.version_label);
    if (summary === undefined) {
      byLabel.set(version.version_label, {
        versionLabel: version.version_label,
        publishedAt: version.published_at,
        languages: [version.language],
        isLawyerReviewed: version.is_lawyer_reviewed,
      });
    } else {
      summary.languages.push(version.language);
    }
  }
  return [...byLabel.values()];
}

/**
 * Picks the current version in the best language, and the history.
 *
 * @param versions - every live version of one document, newest first (useLegalVersions)
 * @param readingLanguage - the interface language, for example 'ro'
 * @returns the text to show, whether it is the fallback language, and the history
 */
export function chooseLegalVersion(
  versions: LegalVersion[],
  readingLanguage: string,
): ChosenLegalVersion {
  const history = summariseHistory(versions);
  const newestLabel = history[0]?.versionLabel;
  const newestVersions = versions.filter((version) => version.version_label === newestLabel);
  // Step 1: the reader's language if it exists.
  const inReadingLanguage = newestVersions.find((version) => version.language === readingLanguage);
  if (inReadingLanguage !== undefined) {
    return { current: inReadingLanguage, isFallbackLanguage: false, history };
  }
  // Step 2: otherwise English (or, failing that, whatever language exists).
  const fallback =
    newestVersions.find((version) => version.language === fallbackLanguage) ??
    newestVersions[0] ??
    null;
  return { current: fallback, isFallbackLanguage: fallback !== null, history };
}
