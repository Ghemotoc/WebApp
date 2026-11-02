/**
 * certificateDate: a date as words in a certificate's language (bundle CLASSES, part e; story
 * S1-E8-12; DoD: dates use locale-aware formatting).
 *
 * Who calls it: CertificateSheet, MyCertificatesPage, PrintedNameForm and VerifyCertificatePage.
 */

/** The two languages a certificate prints in. */
export type CertificateLanguage = 'ro' | 'en';

/**
 * A date in a language, such as "2 noiembrie 2026" or "2 November 2026".
 *
 * @param isoDate - the date from the database
 * @param language - the language to write it in
 * @returns the date as words
 */
export function certificateDate(isoDate: string, language: CertificateLanguage): string {
  // English certificates use British dates ("15 June 2027"), like the rest of the interface.
  const locale = language === 'en' ? 'en-GB' : 'ro';
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(isoDate));
}

/**
 * The certificate language that matches the page's language: English for English, Romanian for
 * everything else (the interface opens in Romanian for everyone).
 *
 * @param pageLanguage - i18n.language
 * @returns 'en' or 'ro'
 */
export function certificateLanguageOf(pageLanguage: string): CertificateLanguage {
  return pageLanguage === 'en' ? 'en' : 'ro';
}
