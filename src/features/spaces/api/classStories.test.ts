/**
 * Tests for stories shared only with a class on the screen side (bundle CLASSES, part c; story
 * S1-E8-11): reading the share, sharing and making public, and the class's list. Supabase is a
 * small fake here; the database rules are in supabase/tests/database/234-class-stories.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import {
  classStoryErrorFrom,
  fetchClassSpaceStories,
  setStoryClass,
  storyClassShareFrom,
} from './classStories';

/**
 * A fake client whose rpc() answers once with the given data or error.
 *
 * @param answer - what the database sends back
 * @returns the client and the rpc spy
 */
function fakeClient(answer: { data?: unknown; error?: { hint?: string } }) {
  const rpc = vi.fn().mockResolvedValue({ data: answer.data ?? null, error: answer.error ?? null });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('storyClassShareFrom', () => {
  it('reads a story shared with a class, and the classes the writer could pick', () => {
    expect(
      storyClassShareFrom({
        class_only: true,
        class: { slug: 'class-9b', name: 'Class 9B' },
        choices: [{ slug: 'class-9b', name: 'Class 9B' }],
      }),
    ).toEqual({
      isClassOnly: true,
      sharedWith: { slug: 'class-9b', name: 'Class 9B' },
      choices: [{ slug: 'class-9b', name: 'Class 9B' }],
    });
  });

  it('keeps a story private when its class was deleted, with no class to name', () => {
    const share = storyClassShareFrom({ class_only: true, class: null, choices: [] });
    expect(share?.isClassOnly).toBe(true);
    expect(share?.sharedWith).toBeNull();
  });

  it('answers null when the story isn’t the caller’s', () => {
    expect(storyClassShareFrom(null)).toBeNull();
  });
});

describe('setStoryClass', () => {
  it('leaves the class out to make the story public again', async () => {
    const { client, rpc } = fakeClient({ data: { class_only: false, class: null, choices: [] } });
    await setStoryClass(client, { storySlug: 'green-notebook', classSlug: null });
    expect(rpc).toHaveBeenCalledWith('set_story_class', { story_slug: 'green-notebook' });
  });

  it('sends the class to share with', async () => {
    const { client, rpc } = fakeClient({ data: { class_only: true, class: null, choices: [] } });
    await setStoryClass(client, { storySlug: 'green-notebook', classSlug: 'class-9b' });
    expect(rpc).toHaveBeenCalledWith('set_story_class', {
      story_slug: 'green-notebook',
      class_slug: 'class-9b',
    });
  });

  it('throws "not yours" when the writer isn’t in that class', async () => {
    const { client } = fakeClient({ error: { hint: 'class:not_yours' } });
    await expect(
      setStoryClass(client, { storySlug: 'x', classSlug: 'other' }),
    ).rejects.toMatchObject({ failure: 'not_yours' });
  });
});

describe('classStoryErrorFrom', () => {
  it('reads a teacher’s refused change as a missing story, never as theirs', () => {
    expect(classStoryErrorFrom({ hint: 'story:missing' }).failure).toBe('missing');
  });

  it('falls back to "couldn’t reach the server" for anything else', () => {
    expect(classStoryErrorFrom({ hint: null }).failure).toBe('unreachable');
  });
});

describe('fetchClassSpaceStories', () => {
  it('reads each story card as a list shows it', async () => {
    const { client } = fakeClient({
      data: [
        {
          id: 's1',
          slug: 'green-notebook',
          title: 'The green notebook',
          blurb: '',
          writer: { handle: 'ioana.v', display_name: 'Ioana' },
          category_slug: 'fiction',
          language_code: 'ro',
          completion_status: 'ongoing',
          rating: '13_plus',
          cover: { kind: 'automatic', design: null, background: null, accent: null },
          chapter_count: 1,
          last_chapter_published_at: null,
        },
      ],
    });
    const stories = await fetchClassSpaceStories(client, 'class-9b');
    expect(stories.map((story) => story.writer.displayName)).toEqual(['Ioana']);
  });
});
