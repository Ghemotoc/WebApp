/**
 * Unit tests for a data request's parent path, server side (bundle ADMIN-2, part c3; story
 * S1-E11-09 criterion 5).
 * Who runs it: `npm test`. The database is a fake fetch and the emails are collected, so these
 * tests check our server's own rules: a staff sign-in, a token staff never see, only its hash
 * stored and signed for the right purpose, the parent's address taken from the database, the link
 * after "#", and the database's refusals answered plainly. The database's own checks are in pgTAP
 * test 244.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OutgoingEmail } from './contact';
import { failureOf, handleDataRequestParent } from './data-request-parent';
import { sha256Hex } from './parent-consent';
import { hmacHex } from './signup-context';

/** A staff sign-in token; the database checks it, not our server. */
const staffToken = 'x.staff.y';
const requestId = '7f0c1a52-1b8e-4c1e-9a55-2d3c4b5a6e7f';

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
function post(path: string, body: unknown, token: string | null = staffToken): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  return new Request(`http://localhost/api/data-request-parent/${path}`, {
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

/** What the database answers for the email. */
const details = {
  parent_email: 'mum@example.com',
  language: 'en',
  handle: 'lia',
  reference: 'D-000012',
  request_type: 'copy',
};

afterEach(() => vi.unstubAllGlobals());

describe('asking the parent or guardian', () => {
  it('stores only a signed hash and emails the parent from the consent a link after "#"', async () => {
    const calls = fakeDatabase({ admin_ask_data_request_parent: { body: details } });
    const sent: OutgoingEmail[] = [];
    const response = await handleDataRequestParent(post('ask', { requestId }), makeOptions(sent));
    expect(response.status).toBe(200);
    const ask = firstOf(calls);
    expect(ask.auth).toBe(`Bearer ${staffToken}`);
    const hash = String(ask.body.token_hash);
    expect(ask.body.signature).toBe(
      await hmacHex(`data-request-ask|${requestId}|${hash}`, 'test-secret'),
    );
    // The token is only in the email, and its hash is what the database got.
    const email = firstOf(sent);
    const token = /\/data-request\/parent#([A-Za-z0-9_-]+)/.exec(email.text)?.[1] ?? '';
    expect(await sha256Hex(token)).toBe(hash);
    expect(JSON.stringify(ask.body)).not.toContain(token);
    expect(email.to).toBe('mum@example.com');
    expect(email.subject).toBe('Did you ask for @lia’s data?');
    expect(email.text).toContain('D-000012');
  });

  it('writes in the language the parent agreed in', async () => {
    fakeDatabase({ admin_ask_data_request_parent: { body: { ...details, language: 'ro' } } });
    const sent: OutgoingEmail[] = [];
    await handleDataRequestParent(post('ask', { requestId }), makeOptions(sent));
    expect(firstOf(sent).subject).toBe('Ai cerut datele contului @lia?');
  });

  it('refuses a visitor who isn’t signed in, and a request that isn’t an ID', async () => {
    fakeDatabase({});
    const options = makeOptions([]);
    expect((await handleDataRequestParent(post('ask', { requestId }, null), options)).status).toBe(
      401,
    );
    expect((await handleDataRequestParent(post('ask', { requestId: 'x' }), options)).status).toBe(
      400,
    );
  });

  it('says plainly why the database refused, and sends nothing', async () => {
    fakeDatabase({
      admin_ask_data_request_parent: { body: { hint: 'no_parent_on_record' }, status: 400 },
    });
    const sent: OutgoingEmail[] = [];
    const response = await handleDataRequestParent(post('ask', { requestId }), makeOptions(sent));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'no_parent_on_record' });
    expect(sent).toHaveLength(0);
  });
});

describe('sending the one-time link to the copy', () => {
  it('signs a link for the copy and tells the parent until when it lasts', async () => {
    const calls = fakeDatabase({
      admin_send_data_request_parent_copy: {
        body: { ...details, expires_at: '2026-11-20T10:00:00Z' },
      },
    });
    const sent: OutgoingEmail[] = [];
    const response = await handleDataRequestParent(post('send', { requestId }), makeOptions(sent));
    expect(response.status).toBe(200);
    const hash = String(firstOf(calls).body.token_hash);
    expect(firstOf(calls).body.signature).toBe(
      await hmacHex(`data-request-copy|${requestId}|${hash}`, 'test-secret'),
    );
    const email = firstOf(sent);
    expect(email.subject).toBe('The copy of @lia’s data is ready');
    expect(email.text).toContain('20 November 2026');
    expect(email.text).toContain('one hour');
  });

  it('says so when the email couldn’t leave', async () => {
    fakeDatabase({ admin_send_data_request_parent_copy: { body: details } });
    const options = { ...makeOptions([]), sendEmail: () => Promise.reject(new Error('down')) };
    const response = await handleDataRequestParent(post('send', { requestId }), options);
    expect(await response.json()).toEqual({ error: 'unavailable' });
  });
});

describe('the rest', () => {
  it('answers 503 without the secret and 404 for an unknown address', async () => {
    fakeDatabase({});
    const withoutSecret = { ...makeOptions([]), secret: undefined };
    expect((await handleDataRequestParent(post('ask', { requestId }), withoutSecret)).status).toBe(
      503,
    );
    expect((await handleDataRequestParent(post('other', {}), makeOptions([]))).status).toBe(404);
  });

  it('turns a refused staff check into not_allowed', () => {
    expect(failureOf('unsigned', 403)).toBe('not_allowed');
    expect(failureOf('request_closed', 400)).toBe('request_closed');
    expect(failureOf(null, 500)).toBe('unavailable');
  });
});
