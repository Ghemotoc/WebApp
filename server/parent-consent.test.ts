/**
 * Unit tests for parental consent's server side (story S1-E2-03; ADR 0011).
 * Who runs it: `npm test`. The database is a fake fetch and the emails are collected, so these
 * tests check our server's own rules: the writer's sign-in for a request, a token the writer never
 * sees, only its hash stored and signed, the link after "#", the database's refusals answered
 * plainly, a yes needing the guardian box, and the email that follows each answer. The
 * database's own checks are in pgTAP test 201.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OutgoingEmail } from './contact';
import { handleParentConsent, sha256Hex, userIdOf } from './parent-consent';
import { consentDate } from './parent-consent/emails';
import { hmacHex } from './signup-context';

/** A sign-in token whose payload names one user; its signature doesn't matter here. */
const writerToken = `x.${btoa(JSON.stringify({ sub: 'writer-id' }))}.y`;

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

/** A POST to one of the two addresses. */
function post(path: string, body: unknown, token: string | null = null): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  return new Request(`http://localhost/api/parent-consent/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/** The first item of a list; fails the test when there is none. */
function firstOf<T>(items: T[]): T {
  const first = items[0];
  if (first === undefined) throw new Error('Expected at least one item.');
  return first;
}

const stored = { outcome: 'ok', handle: 'ana', deadline: '2026-11-20T10:00:00Z' };

afterEach(() => vi.unstubAllGlobals());

describe('asking a parent or guardian', () => {
  it('stores only a signed hash and emails the parent a link with the token after "#"', async () => {
    const calls = fakeDatabase({ begin_parental_consent: { body: stored } });
    const sent: OutgoingEmail[] = [];
    const response = await handleParentConsent(
      post('request', { parentEmail: ' Mum@Example.com ', language: 'en' }, writerToken),
      makeOptions(sent),
    );
    expect(response.status).toBe(200);
    const begin = firstOf(calls);
    expect(begin.auth).toBe(`Bearer ${writerToken}`);
    expect(begin.body.parent_email).toBe('mum@example.com');
    const hash = String(begin.body.token_hash);
    expect(begin.body.signature).toBe(
      await hmacHex(`consent|writer-id|mum@example.com|en|${hash}`, 'test-secret'),
    );
    // The token is only in the email, and its hash is what the database got.
    const email = firstOf(sent);
    const token = /\/parent-consent\/answer#([A-Za-z0-9_-]+)/.exec(email.text)?.[1] ?? '';
    expect(await sha256Hex(token)).toBe(hash);
    expect(JSON.stringify(begin.body)).not.toContain(token);
    expect(email.to).toBe('mum@example.com');
    expect(email.subject).toBe('@ana asked you to agree to their Here account');
    expect(email.text).toContain('20 November 2026');
  });

  it('refuses a visitor who isn’t signed in, and a wrong email', async () => {
    fakeDatabase({});
    const options = makeOptions([]);
    const signedOut = post('request', { parentEmail: 'mum@example.com', language: 'ro' });
    expect((await handleParentConsent(signedOut, options)).status).toBe(401);
    const wrong = post('request', { parentEmail: 'mum', language: 'ro' }, writerToken);
    expect((await handleParentConsent(wrong, options)).status).toBe(400);
  });

  it('says plainly when the database refuses the writer’s own email or a quick resend', async () => {
    const options = makeOptions([]);
    const body = { parentEmail: 'mum@example.com', language: 'ro' };
    fakeDatabase({ begin_parental_consent: { body: { hint: 'own_email' }, status: 400 } });
    const own = await handleParentConsent(post('request', body, writerToken), options);
    expect(await own.json()).toEqual({ error: 'own_email' });
    fakeDatabase({ begin_parental_consent: { body: { hint: 'too_soon' }, status: 400 } });
    const soon = await handleParentConsent(post('request', body, writerToken), options);
    expect(soon.status).toBe(429);
  });

  it('can’t sign anything without the secret', async () => {
    fakeDatabase({});
    const response = await handleParentConsent(
      post('request', { parentEmail: 'mum@example.com', language: 'ro' }, writerToken),
      { ...makeOptions([]), secret: undefined },
    );
    expect(response.status).toBe(503);
  });
});

describe('the parent’s answer', () => {
  const token = 'a'.repeat(43);
  const answered = {
    outcome: 'ok',
    writer_email: 'ana@example.com',
    writer_language: 'ro',
    handle: 'ana',
    parent_email: 'mum@example.com',
  };

  it('signs a yes and sends the parent a confirmation with the link to withdraw', async () => {
    const calls = fakeDatabase({ answer_parental_consent: { body: answered } });
    const sent: OutgoingEmail[] = [];
    const request = post('answer', { token, decision: 'agree', language: 'en', isGuardian: true });
    const response = await handleParentConsent(request, makeOptions(sent));
    expect(await response.json()).toEqual({ decision: 'agree' });
    expect(calls[0]?.auth).toBe('Bearer anon');
    expect(calls[0]?.body.signature).toBe(
      await hmacHex(`answer|${await sha256Hex(token)}|agree`, 'test-secret'),
    );
    expect(sent[0]?.to).toBe('mum@example.com');
    expect(sent[0]?.text).toContain(`/parent-consent/answer#${token}`);
  });

  it('needs the guardian box ticked for a yes', async () => {
    fakeDatabase({});
    const request = post('answer', { token, decision: 'agree', language: 'en', isGuardian: false });
    expect((await handleParentConsent(request, makeOptions([]))).status).toBe(400);
  });

  it('tells the writer in their language when the parent says no', async () => {
    fakeDatabase({ answer_parental_consent: { body: answered } });
    const sent: OutgoingEmail[] = [];
    const request = post('answer', {
      token,
      decision: 'refuse',
      language: 'en',
      isGuardian: false,
    });
    await handleParentConsent(request, makeOptions(sent));
    expect(sent[0]?.to).toBe('ana@example.com');
    expect(sent[0]?.subject).toBe('Contul tău nu va fi activat');
  });

  it('answers a used or unknown link plainly', async () => {
    fakeDatabase({ answer_parental_consent: { body: { outcome: 'gone' } } });
    const request = post('answer', {
      token,
      decision: 'refuse',
      language: 'ro',
      isGuardian: false,
    });
    expect((await handleParentConsent(request, makeOptions([]))).status).toBe(404);
  });
});

describe('small helpers', () => {
  it('reads the user ID from a sign-in token, and nothing from a broken one', () => {
    expect(userIdOf(writerToken)).toBe('writer-id');
    expect(userIdOf('broken')).toBeNull();
  });

  it('writes the deadline in Romania’s time and the reader’s language', () => {
    expect(consentDate('2026-10-30T22:30:00Z', 'ro')).toBe('31 octombrie 2026');
    expect(consentDate('2026-10-30T12:00:00Z', 'en')).toBe('30 October 2026');
  });
});
