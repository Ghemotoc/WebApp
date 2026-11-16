/**
 * The database calls of the writer's Languages screens (bundle TRANSLATE-1c; Robert, 16 Nov
 * 2026): each answer is turned into the app's shape, and publishing picks the right function.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import {
  fetchStoryLanguages,
  fetchTranslationChapters,
  publishTranslation,
  startChapterTranslation,
} from './storyLanguages';

/** A stand-in client whose rpc() answers with the data given. */
function clientAnswering(data: unknown) {
  const rpc = vi.fn().mockResolvedValue({ data, error: null });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('the Languages screens’ database calls', () => {
  it('reads a story’s languages, the original first', async () => {
    const { client } = clientAnswering({
      first_edition_slug: 'statia-meteo',
      languages_max: 5,
      editions: [
        {
          slug: 'statia-meteo',
          language_code: 'ro',
          title: 'Stația meteo',
          blurb: '',
          is_first_edition: true,
          chapters_in_story: 6,
          chapters_published: 6,
          is_public: true,
        },
      ],
    });
    const languages = await fetchStoryLanguages(client, 'statia-meteo');
    expect(languages?.languagesMax).toBe(5);
    expect(languages?.editions[0]).toMatchObject({
      languageCode: 'ro',
      isFirstEdition: true,
      chaptersPublished: 6,
      isPublic: true,
    });
  });

  it('answers null for a story that isn’t the writer’s', async () => {
    const { client } = clientAnswering(null);
    expect(await fetchStoryLanguages(client, 'someone-elses')).toBeNull();
    expect(await fetchTranslationChapters(client, 'someone-elses')).toBeNull();
  });

  it('lists the original’s chapters with where each translation stands', async () => {
    const { client } = clientAnswering([
      {
        number: 1,
        original_code: 'aaaaaaaa',
        original_title: 'Caietul',
        original_status: 'published',
        code: 'bbbbbbbb',
        status: 'draft',
      },
      {
        number: 2,
        original_code: 'cccccccc',
        original_title: null,
        original_status: 'draft',
        code: null,
        status: null,
      },
    ]);
    expect(await fetchTranslationChapters(client, 'the-weather-station')).toEqual([
      {
        number: 1,
        originalCode: 'aaaaaaaa',
        originalTitle: 'Caietul',
        isOriginalPublished: true,
        code: 'bbbbbbbb',
        status: 'draft',
      },
      {
        number: 2,
        originalCode: 'cccccccc',
        originalTitle: '',
        isOriginalPublished: false,
        code: null,
        status: null,
      },
    ]);
  });

  it('gives the new chapter’s code when a translation starts, and nothing when it can’t', async () => {
    const started = clientAnswering({ outcome: 'ok', code: 'dddddddd' });
    expect(await startChapterTranslation(started.client, 'edition', 'aaaaaaaa')).toBe('dddddddd');
    const refused = clientAnswering({ outcome: 'not_found' });
    expect(await startChapterTranslation(refused.client, 'edition', 'aaaaaaaa')).toBeNull();
  });

  it('publishes a draft with publish_chapter() and a live chapter’s changes with update_published_chapter()', async () => {
    const draft = clientAnswering({ outcome: 'original_not_published' });
    expect(await publishTranslation(draft.client, 'dddddddd', false)).toBe(
      'original_not_published',
    );
    expect(draft.rpc).toHaveBeenCalledWith('publish_chapter', { chapter_code: 'dddddddd' });
    const live = clientAnswering({ outcome: 'ok' });
    expect(await publishTranslation(live.client, 'dddddddd', true)).toBe('ok');
    expect(live.rpc).toHaveBeenCalledWith('update_published_chapter', {
      chapter_code: 'dddddddd',
    });
  });

  it('throws when the database can’t be reached', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'offline' } });
    const client = { rpc } as unknown as AppSupabaseClient;
    await expect(fetchStoryLanguages(client, 'statia-meteo')).rejects.toThrow('offline');
  });
});
