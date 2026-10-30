/**
 * Unit tests for the picture check adapter (story S1-E10-05): the stub's name rules, how
 * Sightengine's and Arachnid Shield's answers are read, and how the two are merged.
 * Who runs it: `npm test`. No real service is called: fetch is a fake. The sample answers follow
 * each service's documented shape; the scores are made up.
 */
import { describe, expect, it, vi } from 'vitest';

import { checkWithArachnidShield, readArachnidResponse } from './arachnid';
import { mergeAnswers, pictureChecker, type PictureFile } from './index';
import { checkWithSightengine, readSightengineResponse } from './sightengine';
import { checkWithStub, nameStem } from './stub';

/** A tiny made-up file with the given original name. */
function file(originalName: string): PictureFile {
  return { bytes: new Uint8Array([1, 2, 3]), contentType: 'image/png', originalName };
}

const credentials = { apiUser: 'user', apiSecret: 'secret' };
const arachnidCredentials = { username: 'user', password: 'secret' };

describe('the stub picture check', () => {
  it('reads the name without its folder or ending, in lower case', () => {
    expect(nameStem('C:\\photos\\My Cover_FAIL.png')).toBe('my cover_fail');
    expect(nameStem('noending')).toBe('noending');
  });

  it('passes an ordinary picture', async () => {
    expect((await checkWithStub(file('lighthouse.png'))).outcome).toBe('passed');
  });

  it('flags names ending _fail and _gore, and a _match is a known-abuse match', async () => {
    expect((await checkWithStub(file('cover_fail.jpg'))).outcome).toBe('flagged');
    expect((await checkWithStub(file('cover_gore.jpg'))).flags).toHaveProperty('stub.gore');
    const match = await checkWithStub(file('x_match.webp'));
    expect(match).toMatchObject({ outcome: 'flagged', isKnownAbuseMatch: true });
  });

  it('answers nothing for a name ending _down, as if the services were down', async () => {
    expect((await checkWithStub(file('x_down.png'))).outcome).toBe('unavailable');
  });
});

describe('Sightengine', () => {
  it('passes a picture whose scores stay under the line', () => {
    const answer = readSightengineResponse({
      status: 'success',
      nudity: { sexual_activity: 0.01, none: 0.98 },
      gore: { prob: 0.02 },
    });
    expect(answer).toEqual({ outcome: 'passed', flags: {}, isKnownAbuseMatch: false });
  });

  it('flags nudity or gore at the line and keeps only the scores that mattered', () => {
    const answer = readSightengineResponse({
      status: 'success',
      nudity: { erotica: 0.5, suggestive: 0.9 },
      gore: { prob: 0.7 },
    });
    expect(answer.outcome).toBe('flagged');
    expect(answer.flags).toEqual({ 'nudity.erotica': 0.5, gore: 0.7 });
  });

  it('treats a failed answer as no answer, never as passed', () => {
    expect(readSightengineResponse({ status: 'failure' }).outcome).toBe('unavailable');
  });

  it('answers nothing without credentials or when the service is down', async () => {
    expect(
      (await checkWithSightengine(file('a.png'), { apiUser: '', apiSecret: '' })).outcome,
    ).toBe('unavailable');
    const down = vi.fn(async () => new Response('', { status: 500 }));
    expect((await checkWithSightengine(file('a.png'), credentials, down)).outcome).toBe(
      'unavailable',
    );
  });

  it('sends the file with both models', async () => {
    const fakeFetch = vi.fn(async (_address: string, init: RequestInit) => {
      const form = init.body as FormData;
      expect(form.get('models')).toBe('nudity-2.1,gore-2.0');
      expect(form.get('media')).toBeInstanceOf(Blob);
      return Response.json({ status: 'success', nudity: { none: 0.99 }, gore: { prob: 0.01 } });
    });
    expect(
      (await checkWithSightengine(file('a.png'), credentials, fakeFetch as typeof fetch)).outcome,
    ).toBe('passed');
  });
});

describe('Arachnid Shield', () => {
  it('passes "no-known-match"', () => {
    expect(readArachnidResponse({ classification: 'no-known-match' }).outcome).toBe('passed');
  });

  it('turns any other classification into a known-abuse match', () => {
    const answer = readArachnidResponse({ classification: 'csam', match_type: 'exact' });
    expect(answer).toEqual({
      outcome: 'flagged',
      flags: { classification: 'csam', match_type: 'exact' },
      isKnownAbuseMatch: true,
    });
  });

  it('answers nothing without a classification, credentials or a working service', async () => {
    expect(readArachnidResponse({}).outcome).toBe('unavailable');
    expect(
      (await checkWithArachnidShield(file('a.png'), { username: '', password: '' })).outcome,
    ).toBe('unavailable');
    const failing = vi.fn(async () => Promise.reject(new Error('offline')));
    expect(
      (await checkWithArachnidShield(file('a.png'), arachnidCredentials, failing)).outcome,
    ).toBe('unavailable');
  });

  it('signs in with basic authentication and sends the file as it is', async () => {
    const fakeFetch = vi.fn(async (_address: string, init: RequestInit) => {
      expect((init.headers as Record<string, string>).Authorization).toBe(
        `Basic ${btoa('user:secret')}`,
      );
      expect((init.headers as Record<string, string>)['Content-Type']).toBe('image/png');
      return Response.json({ classification: 'no-known-match' });
    });
    expect(
      (await checkWithArachnidShield(file('a.png'), arachnidCredentials, fakeFetch as typeof fetch))
        .outcome,
    ).toBe('passed');
  });
});

describe('merging the two answers', () => {
  const passed = { outcome: 'passed' as const, flags: {}, isKnownAbuseMatch: false };

  it('passes only when both passed', () => {
    expect(mergeAnswers({ sightengine: passed, arachnid: passed })).toMatchObject({
      outcome: 'passed',
      provider: 'sightengine+arachnid',
    });
  });

  it("a service that didn't answer leaves the picture unchecked", () => {
    const merged = mergeAnswers({
      sightengine: passed,
      arachnid: { ...passed, outcome: 'unavailable' },
    });
    expect(merged.outcome).toBe('unavailable');
  });

  it('a flag wins over a missing answer, and the flags say which service raised them', () => {
    const merged = mergeAnswers({
      sightengine: { outcome: 'flagged', flags: { gore: 0.8 }, isKnownAbuseMatch: false },
      arachnid: { ...passed, outcome: 'unavailable' },
    });
    expect(merged).toMatchObject({ outcome: 'flagged', flags: { 'sightengine.gore': 0.8 } });
  });

  it('a known-abuse match is always flagged', () => {
    const merged = mergeAnswers({
      sightengine: passed,
      arachnid: { outcome: 'flagged', flags: {}, isKnownAbuseMatch: true },
    });
    expect(merged).toMatchObject({ outcome: 'flagged', isKnownAbuseMatch: true });
  });

  it('uses the stub unless the mode is "real"', async () => {
    const settings = {
      sightengine: { apiUser: '', apiSecret: '' },
      arachnid: { username: '', password: '' },
    };
    expect((await pictureChecker({ ...settings, mode: undefined })(file('a.png'))).provider).toBe(
      'stub',
    );
    // Real mode without credentials: nothing is ever shown unchecked.
    expect((await pictureChecker({ ...settings, mode: 'real' })(file('a.png'))).outcome).toBe(
      'unavailable',
    );
  });
});
