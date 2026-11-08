/**
 * Tests for helpSearch (G5b): the Help centre's search narrows the pages and questions.
 */
import { describe, expect, it } from 'vitest';

import type { HelpPageContent, QuestionContent } from '@/schemas/websiteContent';

import type { ParsedEntry } from '../hooks/useWebsiteContent';

import { foldForSearch, matchingHelpPages, matchingQuestions } from './helpSearch';

/** The fields every test entry shares. */
const entryBase = {
  marketCode: 'RO',
  languageCode: 'ro',
  showFrom: '2026-11-01T00:00:00Z',
  showUntil: null,
};

/**
 * A help page for the tests.
 *
 * @returns a parsed help page
 */
function helpPage(entryKey: string, title: string, section: string): ParsedEntry<HelpPageContent> {
  return { ...entryBase, entryKey, content: { title, section, body: 'Text.', isLegal: false } };
}

/**
 * A question for the tests.
 *
 * @returns a parsed question
 */
function question(entryKey: string, words: string, answer: string): ParsedEntry<QuestionContent> {
  return {
    ...entryBase,
    entryKey,
    content: { question: words, answer, position: 1, showOn: 'help', isLegal: false },
  };
}

const pages = [
  helpPage('schedule', 'Programează un capitol', 'Scris și publicare'),
  helpPage('report', 'Ce se întâmplă după ce raportezi', 'Siguranță'),
];

describe('foldForSearch', () => {
  it('ignores capitals, Romanian accents and curly quotes', () => {
    expect(foldForSearch('Întrebări Șterse ȚARĂ can’t')).toBe("intrebari sterse tara can't");
  });
});

describe('matchingHelpPages', () => {
  it('a blank search keeps every page', () => {
    expect(matchingHelpPages(pages, '   ')).toHaveLength(2);
  });

  it('finds a page by its title without the accents', () => {
    expect(matchingHelpPages(pages, 'programeaza').map((page) => page.entryKey)).toEqual([
      'schedule',
    ]);
  });

  it('finds a page by its section, and every typed word must appear', () => {
    expect(matchingHelpPages(pages, 'siguranta').map((page) => page.entryKey)).toEqual(['report']);
    expect(matchingHelpPages(pages, 'siguranta capitol')).toEqual([]);
  });
});

describe('matchingQuestions', () => {
  it('finds a question by words in its answer', () => {
    const questions = [
      question('owns', 'Who owns my story?', 'You do. You keep all the rights.'),
      question('free', 'Is it free?', 'Yes.'),
    ];
    expect(matchingQuestions(questions, 'rights').map((entry) => entry.entryKey)).toEqual(['owns']);
  });
});
