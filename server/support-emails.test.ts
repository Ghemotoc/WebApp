/**
 * Unit tests for the support ticket emails (story S1-E11-13, part 13a; bundle ADMIN-2h2).
 * They cover writing the acknowledgement and an answer, the threading headers, reading Brevo's
 * inbound emails, spotting automatic replies and both handlers' keys. The database is faked with
 * a stubbed fetch; nothing leaves the machine.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  composeSupportEmail,
  handleSupportEmails,
  handleSupportInbound,
  incomingFromBrevo,
  isAutomaticEmail,
  type ClaimedSupportEmail,
  type SupportEmailOptions,
} from './support-emails';

const sender = { name: 'App', email: 'hello@example.test' };

/** A reader that shows which text and values were used, so a test can check both. */
const reader =
  (language: string) =>
  (field: string, values: Record<string, string | number> = {}) =>
    `${language}:${field}${Object.keys(values).length > 0 ? JSON.stringify(values) : ''}`;
const readers = { ro: reader('ro'), en: reader('en') };

/** A due email, with any field changed. */
function claimed(changes: Partial<ClaimedSupportEmail> = {}): ClaimedSupportEmail {
  return {
    email_id: 'e1',
    kind: 'acknowledgement',
    to: 'person@example.test',
    language: 'en',
    both_languages: false,
    number: 1042,
    subject: 'Lost drafts',
    body: null,
    message_token: 'support-00000000-0000-4000-8000-000000000001',
    in_reply_to: null,
    has_account: true,
    ...changes,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('writing support emails', () => {
  it('an acknowledgement has the number in the subject and links to the ticket', () => {
    const email = composeSupportEmail(claimed(), readers, 'https://site.test', sender);
    expect(email.subject).toBe(
      'en:acknowledgementSubject{"number":1042,"subject":"Lost drafts","mergedInto":1042}',
    );
    expect(email.text).toContain('https://site.test/support/1042');
    expect(email.replyTo).toBe('hello@example.test');
  });

  it('someone without an account gets no link to the app', () => {
    const email = composeSupportEmail(
      claimed({ has_account: false }),
      readers,
      'https://site.test',
      sender,
    );
    expect(email.text).not.toContain('acknowledgementInApp');
  });

  it('an email-only acknowledgement in Romanian carries English too', () => {
    const email = composeSupportEmail(
      claimed({ language: 'ro', both_languages: true, has_account: false }),
      readers,
      'https://site.test',
      sender,
    );
    expect(email.text).toContain('ro:acknowledgementBody');
    expect(email.text).toContain('en:acknowledgementBody');
  });

  it('an answer carries the staff words and how to answer, once', () => {
    const email = composeSupportEmail(
      claimed({ kind: 'staff_reply', body: 'Your drafts are safe.', both_languages: true }),
      readers,
      'https://site.test',
      sender,
    );
    expect(email.text.startsWith('Your drafts are safe.')).toBe(true);
    expect(email.text).toContain('en:replyHowToAnswer');
    expect(email.text.match(/Your drafts are safe\./g)).toHaveLength(1);
  });

  it('the auto-solved email says so and how to reopen it (part h3a)', () => {
    const email = composeSupportEmail(
      claimed({ kind: 'auto_solved' }),
      readers,
      'https://site.test',
      sender,
    );
    expect(email.subject).toBe(
      'en:autoSolvedSubject{"number":1042,"subject":"Lost drafts","mergedInto":1042}',
    );
    expect(email.text).toContain('en:autoSolvedBody');
    expect(email.text).toContain('en:replyInApp');
  });

  it('after a merge, says the new number and links to the ticket that stayed (part h4a)', () => {
    const email = composeSupportEmail(
      claimed({ kind: 'merged', merged_into: 1050 }),
      readers,
      'https://site.test',
      sender,
    );
    expect(email.subject).toBe(
      'en:mergedSubject{"number":1042,"subject":"Lost drafts","mergedInto":1050}',
    );
    expect(email.text).toContain('en:mergedBody');
    expect(email.text).toContain('https://site.test/support/1050');
  });

  it('sets our Message-ID and threads under the person’s last email', () => {
    const email = composeSupportEmail(
      claimed({ in_reply_to: '<m1@example.test>' }),
      readers,
      'https://site.test',
      sender,
    );
    expect(email.headers).toEqual({
      'Message-ID': '<support-00000000-0000-4000-8000-000000000001@example.test>',
      'In-Reply-To': '<m1@example.test>',
      References: '<m1@example.test>',
    });
  });
});

describe('reading inbound emails', () => {
  it('keeps the answer without the quoted emails and the threading headers', () => {
    const email = incomingFromBrevo({
      From: { Address: 'person@example.test' },
      Subject: 'Re: Lost drafts [#1042]',
      MessageId: '<m2@example.test>',
      InReplyTo: '<support-1@example.test>',
      ExtractedMarkdownMessage: 'Thanks!',
      RawTextBody: 'Thanks!\n> earlier',
      Headers: { References: '<m1@example.test> <support-1@example.test>' },
    });
    expect(email).toEqual({
      from: 'person@example.test',
      subject: 'Re: Lost drafts [#1042]',
      text: 'Thanks!',
      messageId: '<m2@example.test>',
      threadHeaders: '<support-1@example.test> <m1@example.test> <support-1@example.test>',
      automatic: false,
    });
  });

  it('falls back to the raw text and skips an email without a sender', () => {
    expect(incomingFromBrevo({ From: { Address: 'a@b.test' }, RawTextBody: 'Hi' })?.text).toBe(
      'Hi',
    );
    expect(incomingFromBrevo({ RawTextBody: 'Hi' })).toBeNull();
  });

  it('spots automatic replies and bulk mail', () => {
    expect(isAutomaticEmail({ 'Auto-Submitted': 'auto-replied' })).toBe(true);
    expect(isAutomaticEmail({ precedence: 'bulk' })).toBe(true);
    expect(isAutomaticEmail({ 'Auto-Submitted': 'no' })).toBe(false);
    expect(isAutomaticEmail(undefined)).toBe(false);
  });
});

describe('the handlers', () => {
  const options: SupportEmailOptions = {
    supabaseUrl: 'https://db.test',
    anonKey: 'anon',
    workerKey: 'worker',
    sender,
    productName: 'App',
    companyName: 'Company',
    sendEmail: vi.fn(() => Promise.resolve()),
    readOverrides: () => Promise.resolve(new Map()),
  };

  it('the worker refuses a wrong key and sends nothing', async () => {
    const response = await handleSupportEmails(
      new Request('https://site.test/api/support-emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer wrong' },
      }),
      options,
    );
    expect(response.status).toBe(401);
  });

  it('the worker sends what is due and marks it', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        calls.push(url);
        const body = url.endsWith('support_email_worker_claim') ? [claimed()] : 1;
        return Promise.resolve(Response.json(body));
      }),
    );
    const response = await handleSupportEmails(
      new Request('https://site.test/api/support-emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer worker' },
      }),
      options,
    );
    expect(await response.json()).toEqual({ sent: 1, failed: 0 });
    expect(calls).toEqual([
      'https://db.test/rest/v1/rpc/support_email_worker_claim',
      'https://db.test/rest/v1/rpc/support_email_worker_mark_sent',
    ]);
  });

  const inboundOptions = {
    supabaseUrl: 'https://db.test',
    anonKey: 'anon',
    inboundKey: 'inbound',
    ticketSecret: 'secret',
    now: () => new Date('2026-11-03T12:00:00Z'),
  };

  it('the inbound webhook refuses a wrong key', async () => {
    const response = await handleSupportInbound(
      new Request('https://site.test/api/support-inbound?key=nope', {
        method: 'POST',
        body: '{}',
      }),
      inboundOptions,
    );
    expect(response.status).toBe(401);
  });

  it('the inbound webhook signs each email for the database', async () => {
    const bodies: { payload: string; signature: string }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)) as { payload: string; signature: string });
        return Promise.resolve(Response.json({ number: 1042 }));
      }),
    );
    const response = await handleSupportInbound(
      new Request('https://site.test/api/support-inbound?key=inbound', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ From: { Address: 'a@b.test' }, RawTextBody: 'Hi' }, { RawTextBody: 'x' }],
        }),
      }),
      inboundOptions,
    );
    expect(await response.json()).toEqual({ received: 1, skipped: 1 });
    expect(JSON.parse(bodies[0]?.payload ?? '{}')).toMatchObject({
      from: 'a@b.test',
      sentAt: '2026-11-03T12:00:00.000Z',
    });
    expect(bodies[0]?.signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it('the inbound webhook asks Brevo to try again when the database is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('down'))),
    );
    const response = await handleSupportInbound(
      new Request('https://site.test/api/support-inbound?key=inbound', {
        method: 'POST',
        body: JSON.stringify({ items: [{ From: { Address: 'a@b.test' }, RawTextBody: 'Hi' }] }),
      }),
      inboundOptions,
    );
    expect(response.status).toBe(503);
  });
});
