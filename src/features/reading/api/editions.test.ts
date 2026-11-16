/**
 * The parsers for a story's language editions (bundle TRANSLATE-1b; Robert, 16 Nov 2026).
 */
import { describe, expect, it } from 'vitest';

import { editionFactsFrom, storyEditionsFrom } from './editions';

describe('storyEditionsFrom', () => {
  it('gives no editions for an answer saved before stories had languages', () => {
    expect(storyEditionsFrom(undefined)).toEqual([]);
    expect(storyEditionsFrom(null)).toEqual([]);
  });

  it('turns each edition into the app’s shape, keeping the order', () => {
    const editions = storyEditionsFrom([
      {
        language_code: 'ro',
        slug: 'luceafarul',
        title: 'Luceafărul',
        is_original: true,
        is_current: false,
      },
      {
        language_code: 'en',
        slug: 'the-evening-star',
        title: 'The Evening Star',
        is_original: false,
        translator_name: 'Ana Vlad',
        is_current: true,
        chapter_code: 'abcdefgh',
      },
    ]);
    expect(editions).toEqual([
      {
        languageCode: 'ro',
        slug: 'luceafarul',
        title: 'Luceafărul',
        isOriginal: true,
        translatorName: null,
        isCurrent: false,
        chapterCode: null,
      },
      {
        languageCode: 'en',
        slug: 'the-evening-star',
        title: 'The Evening Star',
        isOriginal: false,
        translatorName: 'Ana Vlad',
        isCurrent: true,
        chapterCode: 'abcdefgh',
      },
    ]);
  });
});

describe('editionFactsFrom', () => {
  it('gives nothing for a story in one language', () => {
    expect(editionFactsFrom(null)).toBeNull();
    expect(editionFactsFrom(undefined)).toBeNull();
  });

  it('reads how much of the story this edition has', () => {
    expect(
      editionFactsFrom({
        original_language: 'ro',
        is_original: false,
        chapters_here: 4,
        chapters_in_story: 6,
        translator_name: null,
      }),
    ).toEqual({
      originalLanguage: 'ro',
      isOriginal: false,
      chaptersHere: 4,
      chaptersInStory: 6,
      translatorName: null,
    });
  });
});
