/**
 * helpSearch: the Help centre's search field, which narrows the help pages and questions already
 * on the page as the visitor types (G5b; board Help, "How can we help?" with "Search help").
 *
 * Nothing is sent anywhere: the published pages and questions are already loaded, so the filter
 * runs in the browser. Accents and capitals are ignored, so "intrebari" finds "Întrebări".
 * Who calls it: HelpCentrePage. What it calls: withBrand, so "{{productName}}" matches the name.
 */
import type { HelpPageContent, QuestionContent } from '@/schemas/websiteContent';

import type { ParsedEntry } from '../hooks/useWebsiteContent';

import { withBrand } from './brandText';

/**
 * Text folded for matching: lower case, accents removed, curly quotes made straight.
 *
 * @param text - any words
 * @returns the folded words
 */
export function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[‘’]/g, "'").toLowerCase();
}

/**
 * The words of the search, folded and split on spaces; every word must appear for a match.
 *
 * @param query - what the visitor typed
 * @returns the folded words, empty when the field is blank
 */
function searchWords(query: string): string[] {
  return foldForSearch(query)
    .split(/\s+/)
    .filter((word) => word !== '');
}

/**
 * Whether every search word appears somewhere in the given texts.
 *
 * @param texts - the fields to look in
 * @param words - the folded search words
 * @returns true when all the words are found (or there are no words)
 */
function matchesAll(texts: string[], words: string[]): boolean {
  const haystack = foldForSearch(texts.map((text) => withBrand(text)).join(' '));
  return words.every((word) => haystack.includes(word));
}

/**
 * The help pages that match the search, by title or section.
 *
 * @param pages - the live help pages
 * @param query - what the visitor typed
 * @returns the matching pages in their order; all of them when the field is blank
 */
export function matchingHelpPages(
  pages: ParsedEntry<HelpPageContent>[],
  query: string,
): ParsedEntry<HelpPageContent>[] {
  const words = searchWords(query);
  return pages.filter((page) => matchesAll([page.content.title, page.content.section], words));
}

/**
 * The questions that match the search, by question or answer.
 *
 * @param questions - the live questions shown on Help
 * @param query - what the visitor typed
 * @returns the matching questions; all of them when the field is blank
 */
export function matchingQuestions(
  questions: ParsedEntry<QuestionContent>[],
  query: string,
): ParsedEntry<QuestionContent>[] {
  const words = searchWords(query);
  return questions.filter((entry) =>
    matchesAll([entry.content.question, entry.content.answer], words),
  );
}
