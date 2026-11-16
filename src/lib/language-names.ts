/**
 * The name of a language, in whichever language the sentence around it is written
 * (bundle TRANSLATE-1b).
 *
 * Who calls it: src/features/reading/ (the "Read in" switch, "Translated from Romanian by …",
 * the chapter that isn't translated yet) and src/features/discovery/ (the language tags on cards).
 * What it calls next: the browser's own Intl.DisplayNames, so no list of names is kept here and
 * a language opened later needs no new text.
 * Two forms, because Romanian grammar needs both: languageOwnName('ro') is "Română", the name a
 * reader of that language looks for in a menu; languageNameIn('ro', 'en') is "Romanian" and
 * languageNameIn('ro', 'ro') is "română", for the middle of a sentence.
 */

/**
 * The name of a language inside a sentence written in another (or the same) language.
 *
 * @param languageCode - the language to name, such as 'ro' or 'en-GB'
 * @param sentenceLanguage - the language of the sentence, such as the interface language
 * @returns the name ("Romanian", "română"), or the code itself when the browser doesn't know it
 */
export function languageNameIn(languageCode: string, sentenceLanguage: string): string {
  try {
    const names = new Intl.DisplayNames([sentenceLanguage], { type: 'language' });
    return names.of(languageCode) ?? languageCode;
  } catch {
    // An odd code (or a very old browser): the code is still better than nothing.
    return languageCode;
  }
}

/**
 * The name of a language in that language, starting with a capital: "Română", "English".
 *
 * @param languageCode - the language to name
 * @returns the name as its own readers write it, for menus and lists
 */
export function languageOwnName(languageCode: string): string {
  const name = languageNameIn(languageCode, languageCode);
  return name.charAt(0).toLocaleUpperCase(languageCode) + name.slice(1);
}
