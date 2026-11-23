/**
 * Tests for the story statement (CALM-9s): the one sentence that tells people and search engines
 * what a story is. The words come from the real English and Romanian locale files.
 */
import { describe, expect, it } from 'vitest';

import englishReading from '@/locales/en/reading.json';
import romanianReading from '@/locales/ro/reading.json';

import {
  shortenForDescription,
  statementPageTitle,
  statementSentence,
  statementSiteLine,
  statementText,
  storyTypeOf,
  type StoryStatementFacts,
} from './story-statement';

const english = englishReading.storyFooter;
const romanian = romanianReading.storyFooter;

/** A plain English story with no genre; each test changes only what it needs. */
function factsWith(changes: Partial<StoryStatementFacts>): StoryStatementFacts {
  return {
    title: 'The Weather Station',
    categorySlug: 'fiction',
    genre: null,
    writerName: 'Lia Writes',
    languageCode: 'en',
    isMature: false,
    ...changes,
  };
}

/** The sentence as one line of text. */
function sentenceOf(facts: StoryStatementFacts, words = english): string {
  return statementSentence(facts, words, 'Brand')
    .map((piece) => piece.text)
    .join('');
}

describe('the story statement', () => {
  it('names the type of writing from the category', () => {
    expect(storyTypeOf('poetry')).toBe('poem');
    expect(storyTypeOf('nonfiction_essays')).toBe('essay');
    expect(storyTypeOf('fiction')).toBe('story');
    expect(storyTypeOf(null)).toBe('story');
  });

  it('says what a story is, with the genre in lower case', () => {
    expect(sentenceOf(factsWith({ genre: 'Mystery' }))).toBe(
      'The Weather Station is a mystery story published on Brand by Lia Writes.',
    );
  });

  it('uses "an" before a vowel', () => {
    expect(sentenceOf(factsWith({ categorySlug: 'nonfiction_essays' }))).toBe(
      'The Weather Station is an essay published on Brand by Lia Writes.',
    );
    expect(sentenceOf(factsWith({ genre: 'Adventure' }))).toBe(
      'The Weather Station is an adventure story published on Brand by Lia Writes.',
    );
  });

  it('keeps the title and the writer as their own pieces, for the cite and the profile link', () => {
    const pieces = statementSentence(factsWith({}), english, 'Brand');
    expect(pieces.filter((piece) => piece.kind === 'title')).toEqual([
      { kind: 'title', text: 'The Weather Station' },
    ]);
    expect(pieces.filter((piece) => piece.kind === 'writer')).toEqual([
      { kind: 'writer', text: 'Lia Writes' },
    ]);
  });

  it('reads in Romanian for a Romanian story', () => {
    const facts = factsWith({ title: 'Stația meteo', languageCode: 'ro', genre: 'Mister' });
    expect(sentenceOf(facts, romanian)).toBe(
      'Stația meteo este o poveste din genul mister, publicată pe Brand de Lia Writes.',
    );
  });

  it('adds only "For mature readers" for an 18+ story, then the blurb', () => {
    expect(statementText(factsWith({ isMature: true }), english, 'Brand', ' Rain at dawn. ')).toBe(
      'The Weather Station is a story published on Brand by Lia Writes. For mature readers. Rain at dawn.',
    );
  });

  it('leaves the blurb out when there is none', () => {
    expect(statementText(factsWith({}), english, 'Brand', '')).toBe(
      'The Weather Station is a story published on Brand by Lia Writes.',
    );
  });

  it('shortens a long description at a whole word, with "…"', () => {
    const text = 'word '.repeat(60);
    const short = shortenForDescription(text);
    expect(short.length).toBeLessThanOrEqual(155);
    expect(short.endsWith('word…')).toBe(true);
    expect(shortenForDescription('A short one.')).toBe('A short one.');
  });

  it('builds the page title with the genre, the category, or neither', () => {
    expect(statementPageTitle(factsWith({ genre: 'Mystery' }), english, 'Brand', 'Fiction')).toBe(
      'The Weather Station by Lia Writes, Mystery, Brand',
    );
    expect(statementPageTitle(factsWith({}), english, 'Brand', 'Fiction')).toBe(
      'The Weather Station by Lia Writes, Fiction, Brand',
    );
    expect(statementPageTitle(factsWith({}), english, 'Brand', null)).toBe(
      'The Weather Station by Lia Writes, Brand',
    );
  });

  it('closes with the line about the site', () => {
    expect(statementSiteLine(english, 'Brand')).toBe(
      'Brand is a free website for writing and reading stories, poems and essays.',
    );
  });
});
