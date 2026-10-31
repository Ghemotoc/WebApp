/** Tests for the shared passage's preview line (story S1-E4-11, second criterion). */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchSharedPassage, passageLine, plainWords, shortenPassage } from './shared-passage';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('plainWords', () => {
  it('takes Markdown marks out and keeps the words', () => {
    expect(plainWords('> **Ploua** peste _oraș_, [vezi](https://example.org).')).toBe(
      'Ploua peste oraș, vezi.',
    );
    expect(plainWords('## Partea întâi')).toBe('Partea întâi');
    expect(plainWords('- unu\n- doi')).toBe('unu doi');
  });
});

describe('shortenPassage', () => {
  it('leaves a short passage as it is', () => {
    expect(shortenPassage('Ploua.')).toBe('Ploua.');
  });

  it('cuts a long one on a space, at 280 characters with the ellipsis', () => {
    const shortened = shortenPassage('cuvânt '.repeat(60));
    expect(Array.from(shortened).length).toBeLessThanOrEqual(280);
    expect(shortened.endsWith('cuvânt…')).toBe(true);
  });
});

describe('passageLine', () => {
  it('joins text and pictures, a picture as its alt text', () => {
    expect(
      passageLine(
        [
          { kind: 'text', markdown: 'Ploua.' },
          { kind: 'picture', alt: 'Un far' },
        ],
        'Imagine: {{alt}}',
      ),
    ).toBe('Ploua. Imagine: Un far');
  });

  it('has no line when there are no words', () => {
    expect(passageLine([], 'Imagine: {{alt}}')).toBeNull();
  });
});

describe('fetchSharedPassage', () => {
  const request = {
    supabaseUrl: 'https://db.example.org',
    anonKey: 'public-anon-key',
    storySlug: 'ploaia',
    chapterCode: 'abcd1234',
    spot: { first: 2, last: 3 },
    pictureWords: 'Picture: {{alt}}',
  };

  it('asks get_shared_passage() as a visitor for the spot’s blocks', async () => {
    const fakeFetch = vi.fn(
      async () => new Response(JSON.stringify({ blocks: [{ kind: 'text', markdown: 'Ploua.' }] })),
    );
    vi.stubGlobal('fetch', fakeFetch);
    expect(await fetchSharedPassage(request)).toBe('Ploua.');
    const [address, init] = fakeFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(address).toBe('https://db.example.org/rest/v1/rpc/get_shared_passage');
    expect(JSON.parse(String(init.body))).toEqual({
      story_slug: 'ploaia',
      chapter_code: 'abcd1234',
      first_block: 2,
      last_block: 3,
    });
  });

  it('has nothing when the database answers null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('null')),
    );
    expect(await fetchSharedPassage(request)).toBeNull();
  });

  it('throws when the database answers with an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    );
    await expect(fetchSharedPassage(request)).rejects.toThrow('get_shared_passage answered 500');
  });
});
