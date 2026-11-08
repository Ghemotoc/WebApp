/**
 * Unit tests for "Tell me when you open here" (bundle G5, part a; story S1-E2-10). They cover the
 * bot check, which country is used, the signed call, the confirm email and its links, the answer
 * that says nothing about who is on the list, and the opening email worker's key and marking.
 * The database is faked with a stubbed fetch; nothing leaves the machine.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  handleOpeningEmails,
  handleOpeningList,
  openingEmail,
  type OpeningEmailOptions,
  type OpeningListOptions,
} from './opening-list';
import { hmacHex } from './signup-context';

const sender = { name: 'App', email: 'hello@example.test' };
const now = new Date('2026-11-08T12:00:00Z');

/** The options with a recording email sender, and any field changed. */
function options(changes: Partial<OpeningListOptions> = {}) {
  const sent: { to: string; subject: string; text: string }[] = [];
  const base: OpeningListOptions = {
    supabaseUrl: 'https://db.test',
    anonKey: 'anon',
    secret: 'secret',
    connectionCountry: 'FR',
    sender,
    productName: 'App',
    companyName: 'Company',
    sendEmail: (email) => {
      sent.push(email);
      return Promise.resolve();
    },
    readOverrides: () => Promise.resolve(new Map()),
    now,
    ...changes,
  };
  return { options: base, sent };
}

/** A form request, as the page sends it. */
function formRequest(body: Record<string, unknown>): Request {
  return new Request('https://site.test/api/opening-list', {
    method: 'POST',
    body: JSON.stringify({ email: 'reader@example.test', language: 'en', ...body }),
  });
}

/** Stubs the database: answers join_opening_list() with the given status and JSON. */
function stubDatabase(status: number, body: unknown) {
  const calls: { url: string; body: { payload: string; signature: string } }[] = [];
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    calls.push({
      url,
      body: JSON.parse(String(init.body)) as { payload: string; signature: string },
    });
    return Promise.resolve(Response.json(body, { status }));
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('joining the list', () => {
  it('signs the fields with the connection country and emails the confirm and remove links', async () => {
    const calls = stubDatabase(200, 'tok123');
    const { options: given, sent } = options();
    const response = await handleOpeningList(formRequest({ countryCode: 'DE' }), given);
    expect(response.status).toBe(200);
    // The connection's country wins over a picked one; the purpose keeps the signature apart.
    const payload = JSON.parse(calls[0]?.body.payload ?? '{}') as Record<string, unknown>;
    expect(payload).toMatchObject({
      purpose: 'opening_list',
      countryCode: 'FR',
      detectedCountryCode: 'FR',
    });
    expect(calls[0]?.body.signature).toBe(await hmacHex(calls[0]?.body.payload ?? '', 'secret'));
    expect(sent[0]?.to).toBe('reader@example.test');
    expect(sent[0]?.subject).toContain('France');
    expect(sent[0]?.text).toContain('https://site.test/open-here/confirm#tok123');
    expect(sent[0]?.text).toContain('https://site.test/open-here/remove#tok123');
  });

  it('uses the picked country only when the connection gave none', async () => {
    const calls = stubDatabase(200, 'tok');
    await handleOpeningList(
      formRequest({ countryCode: 'DE' }),
      options({ connectionCountry: null }).options,
    );
    expect(JSON.parse(calls[0]?.body.payload ?? '{}')).toMatchObject({
      countryCode: 'DE',
      detectedCountryCode: null,
    });
  });

  it('asks for a country when there is none at all', async () => {
    stubDatabase(200, 'tok');
    const response = await handleOpeningList(
      formRequest({}),
      options({ connectionCountry: null }).options,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'no_country' });
  });

  it('says the same when no email is due, so the form tells nothing about who is listed', async () => {
    stubDatabase(200, null);
    const { options: given, sent } = options();
    const response = await handleOpeningList(formRequest({}), given);
    expect(await response.json()).toEqual({ listed: true });
    expect(sent).toHaveLength(0);
  });

  it('gives a bot the same answer and saves nothing', async () => {
    const calls = stubDatabase(200, 'tok');
    const response = await handleOpeningList(formRequest({ website: 'spam' }), options().options);
    expect(await response.json()).toEqual({ listed: true });
    expect(calls).toHaveLength(0);
  });

  it('a form sent faster than a person can is a bot too', async () => {
    const calls = stubDatabase(200, 'tok');
    await handleOpeningList(formRequest({ openedAt: now.getTime() - 500 }), options().options);
    expect(calls).toHaveLength(0);
  });

  it('says when the country is open already', async () => {
    stubDatabase(400, { hint: 'already_open' });
    const response = await handleOpeningList(formRequest({}), options().options);
    expect(response.status).toBe(409);
  });

  it('saves nothing without the secret', async () => {
    const calls = stubDatabase(200, 'tok');
    const response = await handleOpeningList(formRequest({}), options({ secret: '' }).options);
    expect(response.status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it('refuses a request that fails the schema', async () => {
    const response = await handleOpeningList(formRequest({ email: 'nope' }), options().options);
    expect(response.status).toBe(400);
  });
});

describe('the opening emails', () => {
  /** The worker's options with a recording sender. */
  function workerOptions(changes: Partial<OpeningEmailOptions> = {}) {
    const sent: { to: string; subject: string; text: string }[] = [];
    const { options: base } = options();
    const worker: OpeningEmailOptions = {
      ...base,
      workerKey: 'key',
      sendEmail: (email) => {
        sent.push(email);
        return Promise.resolve();
      },
      ...changes,
    };
    return { worker, sent };
  }

  it('writes "open in <country>" with a link to sign up, in the person\'s language', async () => {
    const email = await openingEmail(
      workerOptions().worker,
      { id: 'a', to: 'reader@example.test', country_code: 'FR', language: 'ro' },
      'https://site.test',
    );
    expect(email.subject).toContain('Franța');
    expect(email.text).toContain('https://site.test/sign-up');
  });

  it('refuses a call without the worker key', async () => {
    const request = new Request('https://site.test/api/opening-emails', { method: 'POST' });
    const response = await handleOpeningEmails(request, workerOptions().worker);
    expect(response.status).toBe(401);
  });

  it('sends what it claimed and marks what left', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      calls.push(url);
      if (url.endsWith('opening_email_worker_claim')) {
        return Promise.resolve(
          Response.json([
            { id: 'a', to: 'reader@example.test', country_code: 'FR', language: 'en' },
          ]),
        );
      }
      return Promise.resolve(Response.json(1));
    });
    const { worker, sent } = workerOptions();
    const request = new Request('https://site.test/api/opening-emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer key' },
    });
    const response = await handleOpeningEmails(request, worker);
    expect(await response.json()).toEqual({ sent: 1, failed: 0 });
    expect(sent[0]?.subject).toContain('France');
    expect(calls.at(-1)).toContain('opening_email_worker_mark_sent');
  });
});
