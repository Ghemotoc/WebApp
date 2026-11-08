/**
 * QuestionsStructuredData: the schema.org FAQPage data for the questions on a page (G5b).
 *
 * A <script type="application/ld+json"> is data, not code: the browser never runs it, so the
 * Content Security Policy (script-src 'self') is unaffected. Search engines read it to show the
 * questions and answers. The text is escaped by structuredDataText.
 * Who shows it: WebsiteHomePage and HelpCentrePage, next to their QuestionList.
 * What it calls: faqStructuredData and structuredDataText.
 */
import type { QuestionContent } from '@/schemas/websiteContent';

import type { ParsedEntry } from '../hooks/useWebsiteContent';
import { faqStructuredData, structuredDataText } from '../lib/faqStructuredData';

/**
 * Renders the data block.
 *
 * @param props.questions - the questions shown on the page
 * @returns the script element, or nothing when there are no questions
 */
export function QuestionsStructuredData({
  questions,
}: {
  questions: ParsedEntry<QuestionContent>[];
}) {
  if (questions.length === 0) return null;
  return (
    <script type="application/ld+json">{structuredDataText(faqStructuredData(questions))}</script>
  );
}
