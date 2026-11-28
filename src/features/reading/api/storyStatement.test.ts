/**
 * Tests for reading a story's footer statement from get_link_preview() (CALM-9s).
 */
import { describe, expect, it } from 'vitest';

import { statementFromRow } from './storyStatement';

/** A public story's row; each test changes only what it needs. */
function rowWith(changes: Record<string, unknown>) {
  return {
    title: 'The Weather Station',
    rating: '18_plus',
    language_code: 'en',
    is_listed: true,
    is_app_only: false,
    is_hidden_somewhere: false,
    blurb: 'Rain at dawn.',
    writer: { display_name: 'Lia Writes', handle: 'lia' },
    category_slug: 'fiction',
    genre: 'Mystery',
    ...changes,
  };
}

describe('the story footer statement', () => {
  it('a public story gets its statement, with the profile handle and the 18+ flag', () => {
    expect(statementFromRow(rowWith({}))).toEqual({
      facts: {
        title: 'The Weather Station',
        categorySlug: 'fiction',
        genre: 'Mystery',
        writerName: 'Lia Writes',
        languageCode: 'en',
        isMature: true,
      },
      blurb: 'Rain at dawn.',
      writerHandle: 'lia',
    });
  });

  it('an unlisted or app-only story keeps the site footer', () => {
    expect(statementFromRow(rowWith({ is_listed: false }))).toBeNull();
    expect(statementFromRow(rowWith({ is_app_only: true }))).toBeNull();
  });

  it('a story hidden in some countries carries its statement, as its book page stays in search (COUNTRY-2)', () => {
    expect(statementFromRow(rowWith({ is_hidden_somewhere: true }))).not.toBeNull();
  });

  it('a story without a writer keeps the site footer', () => {
    expect(statementFromRow(rowWith({ writer: null }))).toBeNull();
  });

  it("a classic's author has no profile link", () => {
    const statement = statementFromRow(rowWith({ writer: { display_name: 'Ion Creangă' } }));
    expect(statement?.writerHandle).toBeNull();
  });
});
