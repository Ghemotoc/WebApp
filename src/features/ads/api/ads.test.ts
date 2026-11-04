/**
 * Unit tests for what a page sends when it asks for its ads (bundle SPONSORS, part a1; story
 * S1-E12-01 criterion 2: only the page's context, never anything about the reader).
 */
import { describe, expect, it } from 'vitest';

import { adContextFor } from './ads';

describe('adContextFor', () => {
  it('sends the page’s category, tag, language, story and space under the server’s names', () => {
    expect(
      adContextFor({
        category: 'fiction',
        tag: 'mister',
        language: 'ro',
        storySlug: 'statia-meteo',
        spaceSlug: 'clasa-a-ix-a',
      }),
    ).toEqual({
      category: 'fiction',
      tag: 'mister',
      language: 'ro',
      story_slug: 'statia-meteo',
      space_slug: 'clasa-a-ix-a',
    });
  });

  it('leaves out empty and missing values', () => {
    expect(adContextFor({ category: '', tag: null, language: 'en' })).toEqual({ language: 'en' });
  });
});
