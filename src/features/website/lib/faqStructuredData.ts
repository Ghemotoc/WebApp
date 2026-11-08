/**
 * faqStructuredData: turns the CMS questions into schema.org FAQPage data, so search engines can
 * show the questions and answers (G5b; the handoff's public pages list "FAQ JSON-LD").
 *
 * Who calls it: QuestionsStructuredData, on the home page and the Help centre.
 * What it calls: markdownAsPlainText to drop each answer's Markdown marks, and withBrand to fill
 * the product name. It only builds data; nothing here touches the page.
 */
import type { QuestionContent } from '@/schemas/websiteContent';

import type { ParsedEntry } from '../hooks/useWebsiteContent';

import { withBrand } from './brandText';
import { markdownAsPlainText } from './cmsPlainText';

/** One question in schema.org's shape. */
interface FaqQuestion {
  '@type': 'Question';
  name: string;
  acceptedAnswer: { '@type': 'Answer'; text: string };
}

/** The whole FAQPage object. */
export interface FaqStructuredData {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: FaqQuestion[];
}

/**
 * Builds the FAQPage data for a list of questions, in their order.
 *
 * @param questions - the published questions shown on the page
 * @returns the FAQPage object; its mainEntity is empty when there are no questions
 */
export function faqStructuredData(questions: ParsedEntry<QuestionContent>[]): FaqStructuredData {
  // Same order as the list on the page, so the data matches what people see.
  const ordered = [...questions].sort(
    (first, second) => first.content.position - second.content.position,
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ordered.map((entry) => ({
      '@type': 'Question',
      name: withBrand(entry.content.question),
      // The brand is filled first, because an email token becomes a Markdown link.
      acceptedAnswer: {
        '@type': 'Answer',
        text: markdownAsPlainText(withBrand(entry.content.answer)),
      },
    })),
  };
}

/**
 * The data as text that is safe inside a <script> element: every "<" is escaped, so an answer
 * containing "</script>" can't end the element early.
 *
 * @param data - the FAQPage object
 * @returns JSON text
 */
export function structuredDataText(data: FaqStructuredData): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
