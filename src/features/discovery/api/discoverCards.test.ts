/**
 * Tests for reading Discover's three cards (story S1-E5-12, bundle LOOK-4b). Supabase is a small
 * fake here; the database rules are in supabase/tests/database/305-discover-cards.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { fetchDiscoverCards } from './discoverCards';

/** A story card as story_card_json() writes it. */
const storyRow = {
  id: 'story-1',
  slug: 'harta',
  title: 'Harta din pod',
  blurb: 'x',
  writer: { handle: 'adult_writer', display_name: 'Lia Scrie' },
  category_slug: 'fiction',
  language_code: 'ro',
  completion_status: 'ongoing',
  rating: 'all_ages',
  cover: { kind: 'automatic', design: null, background: null, accent: null },
  chapter_count: 2,
  last_chapter_published_at: '2026-11-05T10:00:00Z',
};

/** A place as latest_place_json() writes it. */
const placeRow = {
  chapter_code: 'abcdefg1',
  number: 1,
  total: 2,
  percent: 80,
  device_kind: 'computer',
  saved_at: '2026-11-03T10:00:00Z',
  next_code: 'abcdefg2',
};

/**
 * A client whose function answers with the given JSON.
 *
 * @returns the fake client and its rpc spy
 */
function clientAnswering(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('fetchDiscoverCards', () => {
  it('turns the three answers into the cards, with "Chapter 2 is out"', async () => {
    const { client, rpc } = clientAnswering({
      continue_reading: { story: storyRow, place: placeRow, new_chapter_number: 2 },
      draft: {
        story_slug: 'harta',
        story_title: 'Harta din pod',
        chapter_code: 'abcdefg3',
        title: null,
        number: 3,
        word_count: 1240,
        saved_at: '2026-11-05T10:00:00Z',
      },
      may_write: true,
    });
    const cards = await fetchDiscoverCards(client);
    expect(rpc).toHaveBeenCalledWith('my_discover_cards');
    expect(cards.continueReading?.story.writer.displayName).toBe('Lia Scrie');
    expect(cards.continueReading?.place).toMatchObject({
      number: 1,
      total: 2,
      nextCode: 'abcdefg2',
    });
    expect(cards.continueReading?.newChapterNumber).toBe(2);
    // A draft without a title gets an empty one, so the card writes "Chapter 3, untitled".
    expect(cards.draft).toMatchObject({
      chapterCode: 'abcdefg3',
      title: '',
      number: 3,
      wordCount: 1240,
    });
    expect(cards.mayWrite).toBe(true);
  });

  it('keeps a missing story or draft as nothing, so its card isn’t drawn', async () => {
    const { client } = clientAnswering({ continue_reading: null, draft: null, may_write: false });
    await expect(fetchDiscoverCards(client)).resolves.toEqual({
      continueReading: null,
      draft: null,
      mayWrite: false,
    });
  });

  it('throws when the database refuses, so the cards stay hidden', async () => {
    const { client } = clientAnswering(null, { message: 'Log in to see your cards.' });
    await expect(fetchDiscoverCards(client)).rejects.toThrow('Log in to see your cards.');
  });
});
