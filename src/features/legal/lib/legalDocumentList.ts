/**
 * The documents the Legal centre shows, in tab order, and how dates are written on them
 * (story S1-E14-01).
 *
 * Who reads it: LegalCentrePage and LegalDocumentNav (the tabs), the footer links
 * (src/app/navigation.ts) and LegalUpdateNotice. Each slug is the document's web address
 * (/legal/<slug>) and its row in public.legal_documents. S1-E14-02 adds the contact page and
 * S1-E14-03 the accessibility statement, each with its own line here.
 */

/** The documents, in the order of the board's tabs (design/boards/Legal.dc.html). */
export const legalDocumentSlugs = ['terms', 'privacy', 'guidelines'] as const;

/** One of the documents above. */
export type LegalDocumentSlug = (typeof legalDocumentSlugs)[number];

/**
 * Says whether an address part is one of the Legal centre's documents.
 *
 * @param value - for example the :documentSlug in /legal/:documentSlug
 * @returns true for a known document
 */
export function isLegalDocumentSlug(value: string | undefined): value is LegalDocumentSlug {
  return legalDocumentSlugs.includes(value as LegalDocumentSlug);
}

/**
 * The date format for each interface language: English dates are written the British way, like
 * the rest of the English copy ("17 October 2026", not "October 17, 2026").
 */
const dateLocales: Record<string, string> = { en: 'en-GB', ro: 'ro' };

/**
 * Writes a version's date the way the reader's language does, in Romanian time (the first market).
 *
 * @param isoDate - published_at from the database
 * @param language - the interface language, for example 'ro'
 * @returns for example "17 octombrie 2026" or "17 October 2026"
 */
export function formatLegalDate(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(dateLocales[language] ?? language, {
    dateStyle: 'long',
    timeZone: 'Europe/Bucharest',
  }).format(new Date(isoDate));
}
