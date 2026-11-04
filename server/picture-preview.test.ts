/**
 * The picture a shared picture link shows in chat previews (bundle IDEAS-2, part f; idea
 * IDEA-20261101-12), with the database and Storage answered by a fake fetch.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { handlePicturePreview, parsePicturePreviewAddress } from './picture-preview';

const settings = { supabaseUrl: 'https://db.example', anonKey: 'anon' };
const address = 'https://example.com/api/picture-preview/farul/pasaj001/3';

/**
 * A fake fetch: get_shared_picture answers `picture`, Storage answers `file`.
 *
 * @returns the addresses asked
 */
function fakeBackend(picture: unknown, file: Response | null) {
  const asked: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      asked.push(url);
      if (url.endsWith('/rest/v1/rpc/get_shared_picture')) {
        return Promise.resolve(new Response(JSON.stringify(picture), { status: 200 }));
      }
      return Promise.resolve(file ?? new Response('no', { status: 400 }));
    }),
  );
  return asked;
}

describe('the picture preview address', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads only addresses the app makes', () => {
    expect(parsePicturePreviewAddress('/api/picture-preview/farul/pasaj001/3')).toEqual({
      storySlug: 'farul',
      chapterCode: 'pasaj001',
      blockNumber: 3,
    });
    expect(parsePicturePreviewAddress('/api/picture-preview/farul/pasaj001/0')).toBeNull();
    expect(parsePicturePreviewAddress('/api/picture-preview/Farul/pasaj001/3')).toBeNull();
    expect(parsePicturePreviewAddress('/api/picture-preview/farul/../3')).toBeNull();
  });

  it('sends a picture that may be shared, read as a visitor, with a short cache', async () => {
    const asked = fakeBackend(
      { bucket: 'chapter-images', path: 'chapter-id/picture-id.png', alt: 'Un far' },
      new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } }),
    );
    const response = await handlePicturePreview(new Request(address), settings);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(asked[1]).toBe(
      'https://db.example/storage/v1/object/authenticated/chapter-images/chapter-id/picture-id.png',
    );
  });

  it('answers 404 when the picture may not be shared (in its check, removed, 16+)', async () => {
    fakeBackend(null, null);
    const response = await handlePicturePreview(new Request(address), settings);
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('answers 404 when Storage sends something that is not a picture', async () => {
    fakeBackend(
      { bucket: 'chapter-images', path: 'chapter-id/picture-id.png', alt: '' },
      new Response('<html>', { headers: { 'Content-Type': 'text/html' } }),
    );
    expect((await handlePicturePreview(new Request(address), settings)).status).toBe(404);
  });

  it('answers 404 to anything but GET', async () => {
    fakeBackend(null, null);
    const response = await handlePicturePreview(new Request(address, { method: 'POST' }), settings);
    expect(response.status).toBe(404);
  });
});
