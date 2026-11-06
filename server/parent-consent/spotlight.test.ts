/**
 * Unit tests for the parent's separate yes to suggestions, server side (story S1-E2-03b, bundle
 * LOOK-4c). Who runs it: `npm test`. The database is a fake fetch and the emails are collected,
 * so these tests check our server's own rules: the child's sign-in to ask, a token the child never
 * sees, only its signed hash stored, the link after "#", one email an hour, the parent's signed
 * answer with its confirmation, and the consent page's box signed only with a yes. The database's
 * own checks are in pgTAP test 304.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OutgoingEmail } from '../contact';
import { handleParentConsent, sha256Hex } from '../parent-consent';
import { hmacHex } from '../signup-context';

/** A sign-in token whose payload names one user; its signature doesn't matter here. */
const childToken = `x.${btoa(JSON.stringify({ sub: 'child-id' }))}.y`;

/** The handler's options, with every email collected instead of sent. */
function makeOptions(sent: OutgoingEmail[]) {
  return {
    supabaseUrl: 'http://db',
    anonKey: 'anon',
    secret: 'test-secret' as string | undefined,
    sender: { name: 'Here', email: 'hello@example.com' },
    productName: 'Here',
    companyName: 'Company',
    sendEmail: (email: OutgoingEmail) => {
      sent.push(email);
      return Promise.resolve();
    },
    readOverrides: () => Promise.resolve(new Map<string, string>()),
  };
}

/** A fake database that answers each function with the given body (and status). */
function fakeDatabase(answers: Record<string, { body: unknown; status?: number }>) {
  const calls: { name: string; body: Record<string, unknown>; auth: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((address: string, init?: RequestInit) => {
      const name = address.split('/rpc/')[1] ?? '';
      const headers = init?.headers as Record<string, string>;
      calls.push({
        name,
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
        auth: headers.Authorization ?? '',
      });
      const answer = answers[name] ?? { body: {} };
      return Promise.resolve(Response.json(answer.body, { status: answer.status ?? 200 }));
    }),
  );
  return calls;
}

/** A POST to one address under /api/parent-consent/. */
function post(path: string, body: unknown, token: string | null = null): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  return new Request(`http://localhost/api/parent-consent/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('a 14-year-old asks their parent about suggestions', () => {
  const stored = { outcome: 'ok', parent_email: 'mum@example.com', language: 'en', handle: 'ana' };

  it('stores only a signed hash and emails the parent a link with the token after "#"', async () => {
    const calls = fakeDatabase({ begin_spotlight_request: { body: stored } });
    const sent: OutgoingEmail[] = [];
    const response = await handleParentConsent(
      post('spotlight-request', {}, childToken),
      makeOptions(sent),
    );
    expect(response.status).toBe(200);
    const begin = calls[0];
    expect(begin?.auth).toBe(`Bearer ${childToken}`);
    const hash = String(begin?.body.token_hash);
    expect(begin?.body.signature).toBe(await hmacHex(`spotlight|child-id|${hash}`, 'test-secret'));
    const email = sent[0];
    const token = /\/parent-consent\/spotlight#([A-Za-z0-9_-]+)/.exec(email?.text ?? '')?.[1] ?? '';
    expect(await sha256Hex(token)).toBe(hash);
    expect(email?.to).toBe('mum@example.com');
    expect(email?.subject).toBe('May we suggest @ana to other readers?');
  });

  it('refuses a visitor, and says plainly when there is nothing to ask or it is too soon', async () => {
    const options = makeOptions([]);
    fakeDatabase({});
    expect((await handleParentConsent(post('spotlight-request', {}), options)).status).toBe(401);
    fakeDatabase({ begin_spotlight_request: { body: { outcome: 'not_needed' } } });
    const notNeeded = await handleParentConsent(post('spotlight-request', {}, childToken), options);
    expect(await notNeeded.json()).toEqual({ error: 'not_needed' });
    fakeDatabase({ begin_spotlight_request: { body: { hint: 'too_soon' }, status: 400 } });
    const soon = await handleParentConsent(post('spotlight-request', {}, childToken), options);
    expect(soon.status).toBe(429);
  });
});

describe('the parent answers about suggestions', () => {
  const token = 'b'.repeat(43);
  const answered = { outcome: 'ok', parent_email: 'mum@example.com', handle: 'ana' };

  it('signs a yes and sends the parent a confirmation with the same link', async () => {
    const calls = fakeDatabase({ answer_spotlight_consent: { body: answered } });
    const sent: OutgoingEmail[] = [];
    const request = post('spotlight-answer', { token, decision: 'agree', language: 'en' });
    const response = await handleParentConsent(request, makeOptions(sent));
    expect(await response.json()).toEqual({ decision: 'agree' });
    expect(calls[0]?.auth).toBe('Bearer anon');
    expect(calls[0]?.body.signature).toBe(
      await hmacHex(`spotlight-answer|${await sha256Hex(token)}|agree`, 'test-secret'),
    );
    expect(sent[0]?.subject).toBe('You agreed that we may suggest @ana');
    expect(sent[0]?.text).toContain(`/parent-consent/spotlight#${token}`);
  });

  it('confirms a withdrawal, and answers an unknown link plainly', async () => {
    fakeDatabase({ answer_spotlight_consent: { body: answered } });
    const sent: OutgoingEmail[] = [];
    const withdraw = post('spotlight-answer', { token, decision: 'withdraw', language: 'ro' });
    expect((await handleParentConsent(withdraw, makeOptions(sent))).status).toBe(200);
    expect(sent[0]?.subject).toBe('Nu mai recomandăm contul @ana');
    fakeDatabase({ answer_spotlight_consent: { body: { outcome: 'gone' } } });
    const again = post('spotlight-answer', { token, decision: 'withdraw', language: 'ro' });
    const gone = await handleParentConsent(again, makeOptions([]));
    expect(gone.status).toBe(404);
  });

  it('refuses any other decision', async () => {
    fakeDatabase({});
    const request = post('spotlight-answer', { token, decision: 'refuse', language: 'en' });
    expect((await handleParentConsent(request, makeOptions([]))).status).toBe(400);
  });
});

describe('the consent page’s suggestions box', () => {
  const token = 'c'.repeat(43);
  const answered = { outcome: 'ok', handle: 'ana', parent_email: 'mum@example.com' };

  it('is signed into a yes, and the confirmation names it with its own link', async () => {
    const calls = fakeDatabase({
      answer_parental_consent: { body: { ...answered, allow_spotlight: true } },
    });
    const sent: OutgoingEmail[] = [];
    const body = {
      token,
      decision: 'agree',
      language: 'en',
      isGuardian: true,
      allowSpotlight: true,
    };
    await handleParentConsent(post('answer', body), makeOptions(sent));
    expect(calls[0]?.body.allow_spotlight).toBe(true);
    expect(calls[0]?.body.signature).toBe(
      await hmacHex(`answer|${await sha256Hex(token)}|agree|spotlight`, 'test-secret'),
    );
    expect(sent[0]?.text).toContain(`/parent-consent/spotlight#${token}`);
  });

  it('never counts with a no', async () => {
    const calls = fakeDatabase({ answer_parental_consent: { body: answered } });
    const body = {
      token,
      decision: 'refuse',
      language: 'en',
      isGuardian: false,
      allowSpotlight: true,
    };
    await handleParentConsent(post('answer', body), makeOptions([]));
    expect(calls[0]?.body.allow_spotlight).toBe(false);
    expect(calls[0]?.body.signature).toBe(
      await hmacHex(`answer|${await sha256Hex(token)}|refuse`, 'test-secret'),
    );
  });
});
