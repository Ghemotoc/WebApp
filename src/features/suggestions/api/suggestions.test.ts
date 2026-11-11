/**
 * Tests for reading a suggestion row's answer (story S1-E15-06): cards become stories, the
 * finished story comes through for "Because you read", and anything unexpected is an empty row.
 */
import { describe, expect, it } from 'vitest';

import type { Json } from '@/lib/database.types';

import { suggestionRowFromAnswer } from './suggestions';

/** One card as story_card_json() answers it. */
const card = {
  id: '00000000-0000-4000-9000-000000000003',
  slug: 'scrisori-din-cutia-postala-seed03',
  title: 'Scrisori din cutia poștală',
  blurb: 'Letters.',
  writer: { handle: 'teen_17', display_name: 'Ana' },
  category_slug: 'fiction',
  language_code: 'ro',
  completion_status: 'ongoing',
  rating: 'all_ages',
  cover: { kind: 'automatic', design: null, background: null, accent: null },
  chapter_count: 1,
  last_chapter_published_at: null,
} satisfies Json;

describe('suggestionRowFromAnswer', () => {
  it('turns the cards into stories, with no finished story for a story-page row', () => {
    const row = suggestionRowFromAnswer({ stories: [card] });
    expect(row.stories.map((story) => story.slug)).toEqual(['scrisori-din-cutia-postala-seed03']);
    expect(row.stories[0]?.writer.displayName).toBe('Ana');
    expect(row.source).toBeNull();
  });

  it('keeps the finished story that "Because you read" starts from', () => {
    const row = suggestionRowFromAnswer({
      source: { ...card, title: 'Stația meteo' },
      stories: [card],
    });
    expect(row.source?.title).toBe('Stația meteo');
  });

  it('gives an empty row for an answer it does not recognise', () => {
    expect(suggestionRowFromAnswer(null)).toEqual({ stories: [], source: null });
    expect(suggestionRowFromAnswer([card])).toEqual({ stories: [], source: null });
    expect(suggestionRowFromAnswer({ stories: [42, 'x'] }).stories).toEqual([]);
  });
});
