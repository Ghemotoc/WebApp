/**
 * The device draft store (story S1-E3-02b), on a fake IndexedDB.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { forgetDraftOnDevice, keepDraftOnDevice, readDraftOnDevice } from './draftStore';

describe('the draft kept on the device', () => {
  beforeEach(async () => {
    await forgetDraftOnDevice('abcdefgh');
  });

  it('keeps a draft and reads it back with the time it was kept', async () => {
    await keepDraftOnDevice({
      code: 'abcdefgh',
      title: 'Unu',
      body: 'Text **gras**',
      baseVersion: 3,
    });
    const kept = await readDraftOnDevice('abcdefgh');
    expect(kept).toMatchObject({
      code: 'abcdefgh',
      title: 'Unu',
      body: 'Text **gras**',
      baseVersion: 3,
    });
    expect(typeof kept?.keptAt).toBe('number');
  });

  it('replaces the copy on every keep and answers null once forgotten', async () => {
    await keepDraftOnDevice({ code: 'abcdefgh', title: 'Unu', body: 'first', baseVersion: 3 });
    await keepDraftOnDevice({ code: 'abcdefgh', title: 'Unu', body: 'second', baseVersion: 3 });
    expect((await readDraftOnDevice('abcdefgh'))?.body).toBe('second');
    await forgetDraftOnDevice('abcdefgh');
    expect(await readDraftOnDevice('abcdefgh')).toBeNull();
  });

  it('answers null for a chapter it never saw', async () => {
    expect(await readDraftOnDevice('nothing1')).toBeNull();
  });
});
