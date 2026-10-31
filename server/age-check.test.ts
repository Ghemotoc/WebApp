/**
 * Unit tests for the age check's server side (story S1-E2-08, part 08a; ADR 0010).
 * Who runs it: `npm test`. The database is a fake fetch, so these tests check our server's own
 * rules: the person's token for the start, the line from the database, only the session ID, SDK
 * ID and page answered, an unsigned notification refused, the signed save, the stand-in's pages
 * gone in real mode, and Yoti's result and signature read correctly. The database's own checks
 * are in pgTAP test 199.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleAgeCheck, handleNotification } from './age-check';
import { standInNotification, standInYoti } from './age-check/stub';
import { resultFromYoti, verifyPssSignature, yotiSessionBody } from './age-check/yoti';
import { hmacHex } from './signup-context';

const options = {
  supabaseUrl: 'http://db',
  anonKey: 'anon',
  secret: 'test-secret',
  settings: { mode: 'stub' },
};

/** A fake database: my_age_check() answers the given line; the writes answer ok. */
function fakeDatabase(
  myAgeCheck: Record<string, unknown> = { outcome: 'ok', threshold: 18, can_start: true },
) {
  const calls: { address: string; init: RequestInit | undefined }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (address: string, init?: RequestInit) => {
      calls.push({ address, init });
      if (address.endsWith('/rpc/my_age_check')) return Response.json(myAgeCheck);
      if (address.endsWith('/rpc/record_age_check_result'))
        return Response.json({ outcome: 'ok', result: '18_or_over' });
      return Response.json({ outcome: 'ok' });
    }),
  );
  return calls;
}

/** A start request, with or without the person's token. */
function startRequest(token: string | null = 'person-token'): Request {
  const headers: Record<string, string> = {};
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  return new Request('http://localhost/api/age-check/start', { method: 'POST', headers });
}

afterEach(() => vi.unstubAllGlobals());

describe('starting an age check', () => {
  it('answers only the session ID, the SDK ID and the page, and signs the link', async () => {
    const calls = fakeDatabase();
    const response = await handleAgeCheck(startRequest(), options);
    const body = (await response.json()) as Record<string, string>;
    expect(response.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(['checkUrl', 'sdkId', 'sessionId']);
    expect(body.checkUrl).toContain('/api/age-check/stub/check?');
    expect(body.checkUrl).toContain('line=18');
    const begin = calls.find((call) => call.address.endsWith('/rpc/begin_age_check'));
    const sent = JSON.parse(String(begin?.init?.body)) as Record<string, unknown>;
    expect(sent.signature).toBe(await hmacHex(`begin|${body.sessionId}|18`, 'test-secret'));
    expect((begin?.init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer person-token',
    );
  });

  it('refuses a visitor who isn’t signed in', async () => {
    fakeDatabase();
    expect((await handleAgeCheck(startRequest(null), options)).status).toBe(401);
  });

  it('says no check is needed when the database says one can’t start', async () => {
    fakeDatabase({ outcome: 'ok', threshold: 13, can_start: false });
    const response = await handleAgeCheck(startRequest(), options);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'not_needed' });
  });

  it('is unavailable without the signing secret', async () => {
    fakeDatabase();
    expect((await handleAgeCheck(startRequest(), { ...options, secret: '' })).status).toBe(503);
  });

  it('is unavailable in real mode without Yoti’s credentials', async () => {
    fakeDatabase();
    const real = { ...options, settings: { mode: 'real' } };
    expect((await handleAgeCheck(startRequest(), real)).status).toBe(503);
  });
});

describe('a notification', () => {
  const service = standInYoti('http://localhost');
  const ready = { ...options, secret: 'test-secret' };

  it('is refused when it isn’t signed', async () => {
    const calls = fakeDatabase();
    const body = JSON.stringify({
      session_id: 's1',
      outcome: 'passed',
      method: 'id_document',
      signature: 'x',
    });
    const response = await handleNotification(body, new Headers(), ready, service);
    expect(response.status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it('stores a signed result, signed with our own secret', async () => {
    const calls = fakeDatabase();
    const body = await standInNotification('s1', { outcome: 'passed', method: 'id_document' });
    const response = await handleNotification(body, new Headers(), ready, service);
    expect(await response.json()).toEqual({ stored: true });
    const sent = JSON.parse(String(calls[0]?.init?.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({ yoti_session_id: 's1', outcome: 'passed', method: 'id_document' });
    expect(sent.signature).toBe(await hmacHex('result|s1|passed|id_document', 'test-secret'));
  });
});

describe('the stand-in in real mode', () => {
  it('has no pages', async () => {
    const real = { ...options, settings: { mode: 'real' } };
    const check = new Request('http://localhost/api/age-check/stub/check?sessionId=s1');
    const finish = new Request(
      'http://localhost/api/age-check/stub/finish?sessionId=s1&outcome=passed',
    );
    expect((await handleAgeCheck(check, real)).status).toBe(404);
    expect((await handleAgeCheck(finish, real)).status).toBe(404);
  });
});

describe('reading Yoti', () => {
  it('turns a finished session into a pass or a failure, and anything else into nothing', () => {
    expect(resultFromYoti({ status: 'COMPLETE', method: 'AGE_ESTIMATION' })).toEqual({
      outcome: 'passed',
      method: 'facial_estimation',
    });
    expect(resultFromYoti({ status: 'FAIL', method: 'DOC_SCAN' })).toEqual({
      outcome: 'failed',
      method: 'id_document',
    });
    expect(resultFromYoti({ status: 'IN_PROGRESS', method: 'DOC_SCAN' })).toBeNull();
    expect(resultFromYoti({ status: 'COMPLETE', method: 'DIGITAL_ID' })).toBeNull();
  });

  it('offers only facial estimation and an ID document, with a reference and no personal data', () => {
    const body = yotiSessionBody({
      threshold: 13,
      referenceId: 'random',
      returnUrl: 'https://site/age-check/return',
      notificationUrl: 'https://site/api/age-check/webhook',
    });
    expect(body).toMatchObject({
      reference_id: 'random',
      age_estimation: { allowed: true, threshold: 13 },
      doc_scan: { allowed: true, threshold: 13 },
      digital_id: { allowed: false },
    });
  });

  it('accepts only a notification signed with Yoti’s key', async () => {
    const keys = await crypto.subtle.generateKey(
      {
        name: 'RSA-PSS',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    );
    const spki = new Uint8Array(await crypto.subtle.exportKey('spki', keys.publicKey));
    const pem = `-----BEGIN PUBLIC KEY-----\n${btoa(String.fromCharCode(...spki))}\n-----END PUBLIC KEY-----`;
    const text = '{"session_id":"s1"}';
    const signed = new Uint8Array(
      await crypto.subtle.sign(
        { name: 'RSA-PSS', saltLength: 32 },
        keys.privateKey,
        new TextEncoder().encode(text),
      ),
    );
    const signature = btoa(String.fromCharCode(...signed));
    expect(await verifyPssSignature(text, signature, pem)).toBe(true);
    expect(await verifyPssSignature('{"session_id":"s2"}', signature, pem)).toBe(false);
    expect(await verifyPssSignature(text, 'not base64!', pem)).toBe(false);
  });
});
