/**
 * Tests for faqStructuredData (G5b): the FAQPage data search engines read from the questions.
 */
import { describe, expect, it } from 'vitest';

import { brand } from '@/config/brand';
import type { QuestionContent } from '@/schemas/websiteContent';

import type { ParsedEntry } from '../hooks/useWebsiteContent';

import { faqStructuredData, structuredDataText } from './faqStructuredData';

/**
 * One published question for the tests.
 *
 * @returns a parsed entry with the given words and position
 */
function question(entryKey: string, words: Partial<QuestionContent>): ParsedEntry<QuestionContent> {
  return {
    entryKey,
    marketCode: 'RO',
    languageCode: 'en',
    showFrom: '2026-11-01T00:00:00Z',
    showUntil: null,
    content: {
      question: 'A question?',
      answer: 'An answer.',
      position: 1,
      showOn: 'both',
      isLegal: false,
      ...words,
    },
  };
}

describe('faqStructuredData', () => {
  it('lists the questions in their order as schema.org Questions with the brand filled in', () => {
    const data = faqStructuredData([
      question('second', { question: 'Is {{productName}} free?', position: 2 }),
      question('first', { question: 'Who owns my story?', answer: 'You do.', position: 1 }),
    ]);
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity.map((entry) => entry.name)).toEqual([
      'Who owns my story?',
      `Is ${brand.productName} free?`,
    ]);
    expect(data.mainEntity[0]?.acceptedAnswer).toEqual({ '@type': 'Answer', text: 'You do.' });
  });

  it('an email placeholder in an answer becomes the plain address, not a Markdown link', () => {
    const data = faqStructuredData([question('mail', { answer: 'Write to {{contactEmail}}.' })]);
    expect(data.mainEntity[0]?.acceptedAnswer.text).toBe(`Write to ${brand.contactEmail}.`);
  });
});

describe('structuredDataText', () => {
  it('an answer containing a closing script tag can’t end the data block early', () => {
    const text = structuredDataText(
      faqStructuredData([question('tricky', { answer: 'Type `</script>` here.' })]),
    );
    expect(text).not.toContain('</script>');
    expect(JSON.parse(text)).toMatchObject({ '@type': 'FAQPage' });
  });
});
