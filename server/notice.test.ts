/**
 * Unit tests for the public report form's handler (story S1-E10-02).
 * Who runs it: `npm test`. The database is a fake fetch, so these tests check the handler's own
 * rules: the shared schema, the accessible bot check (never for an authority order), the signed
 * payload and the acknowledgement emails. The database's own checks are in pgTAP test 145.
 * Names, addresses and the product name are made-up examples.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OutgoingEmail } from './contact';
import { acknowledgementEmails, formatReceiptTime, handleNotice, looksLikeABot } from './notice';
import { hmacHex } from './signup-context';

const now = new Date('2026-10-25T09:00:00Z');
const opened = now.getTime() - 60_000;

/** A request with the given JSON body, as the form sends it. */
function postJson(body: unknown): Request {
  return new Request('http://localhost/api/notice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Collects the emails instead of sending them. */
function recorder() {
  const sent: OutgoingEmail[] = [];
  return { sent, sendEmail: async (email: OutgoingEmail) => void sent.push(email) };
}

/** A fake database answering submit_public_notice(), keeping what it was sent. */
function fakeDatabase(reference: string, status = 200) {
  const calls: { payload: string; signature: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(String(init.body)) as { payload: string; signature: string });
      return new Response(
        JSON.stringify([{ notice_reference: reference, received_at: '2026-10-25T09:00:00Z' }]),
        { status },
      );
    }),
  );
  return calls;
}

const notice = {
  kind: 'notice',
  reason: 'copyright',
  contentUrl: 'https://example.test/s/a-story',
  explanation: 'This is my poem, copied without asking.',
  notifierName: 'Ana Pop',
  notifierEmail: 'ana@example.test',
  goodFaith: true,
  language: 'ro',
  website: '',
  openedAt: opened,
};

const order = {
  kind: 'removal_order',
  contentUrl: '/u/someone',
  explanation: 'Removal order no. 12 under Regulation (EU) 2021/784.',
  authorityName: 'Test authority',
  orderReference: 'RO-12',
  notifierEmail: 'orders@authority.test',
  language: 'en',
};

const options = (sendEmail: ReturnType<typeof recorder>['sendEmail']) => ({
  supabaseUrl: 'http://database.test',
  anonKey: 'anon-key',
  secret: 'test-secret',
  supportEmail: 'help@example.test',
  productName: 'Example',
  sendEmail,
  now,
});

afterEach(() => vi.unstubAllGlobals());

describe('the public report form handler', () => {
  it('saves a notice signed with the secret and emails the acknowledgement with the reference', async () => {
    const calls = fakeDatabase('N-000001');
    const mail = recorder();
    const response = await handleNotice(postJson(notice), options(mail.sendEmail));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reference: 'N-000001', acknowledged: true });
    const call = calls[0];
    expect(call?.signature).toBe(await hmacHex(call?.payload ?? '', 'test-secret'));
    expect(JSON.parse(call?.payload ?? '{}')).not.toHaveProperty('website');
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0]?.to).toBe('ana@example.test');
    expect(mail.sent[0]?.text).toContain('N-000001');
  });

  it('refuses a notice without a name and email, except for child sexual content', async () => {
    fakeDatabase('N-000002');
    const mail = recorder();
    const withoutContact = { ...notice, notifierName: '', notifierEmail: '' };
    expect((await handleNotice(postJson(withoutContact), options(mail.sendEmail))).status).toBe(
      400,
    );
    const childSafety = { ...withoutContact, reason: 'child_sexual_content' };
    expect((await handleNotice(postJson(childSafety), options(mail.sendEmail))).status).toBe(200);
    // Nobody to acknowledge: no email given.
    expect(mail.sent).toHaveLength(0);
  });

  it('refuses a notice without the good-faith statement', async () => {
    fakeDatabase('N-000003');
    const response = await handleNotice(
      postJson({ ...notice, goodFaith: false }),
      options(recorder().sendEmail),
    );
    expect(response.status).toBe(400);
  });

  it('gives a bot a made-up answer and saves nothing: honeypot filled, or sent in under 3 seconds', async () => {
    const calls = fakeDatabase('N-000004');
    const mail = recorder();
    await handleNotice(postJson({ ...notice, website: 'spam' }), options(mail.sendEmail));
    await handleNotice(
      postJson({ ...notice, openedAt: now.getTime() - 1000 }),
      options(mail.sendEmail),
    );
    expect(calls).toHaveLength(0);
    expect(mail.sent).toHaveLength(0);
  });

  it('never runs the bot check on an authority order, and emails the authority and the inbox', async () => {
    const calls = fakeDatabase('TCO-0002');
    const mail = recorder();
    const response = await handleNotice(postJson(order), options(mail.sendEmail));
    expect(response.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(mail.sent.map((email) => email.to)).toEqual([
      'orders@authority.test',
      'help@example.test',
    ]);
    expect(mail.sent[0]?.text).toContain('Time of receipt');
    expect(mail.sent[1]?.subject).toContain('act within one hour');
  });

  it('says it is unavailable when the secret is missing, and still answers when an email fails', async () => {
    fakeDatabase('N-000005');
    const noSecret = { ...options(recorder().sendEmail), secret: undefined };
    expect((await handleNotice(postJson(notice), noSecret)).status).toBe(503);
    const failing = options(() => Promise.reject(new Error('down')));
    const response = await handleNotice(postJson(notice), failing);
    expect(await response.json()).toMatchObject({ reference: 'N-000005', acknowledged: false });
  });

  it('passes on the database refusing the fields as "invalid"', async () => {
    fakeDatabase('N-000006', 400);
    expect((await handleNotice(postJson(notice), options(recorder().sendEmail))).status).toBe(400);
  });
});

describe('the pieces', () => {
  it('writes the time of receipt in Romania time', () => {
    expect(formatReceiptTime('2026-10-25T09:00:00Z', 'en')).toContain('11:00:00');
  });

  it('treats a form with no opening time as a person', () => {
    expect(
      looksLikeABot(
        {
          ...notice,
          kind: 'notice',
          reason: 'copyright',
          language: 'ro',
          goodFaith: true,
          openedAt: undefined,
        },
        now,
      ),
    ).toBe(false);
  });

  it("writes the acknowledgement in the notifier's language", () => {
    const emails = acknowledgementEmails(
      {
        kind: 'notice',
        reason: 'spam',
        contentUrl: '/s/x',
        explanation: 'Links.',
        notifierName: 'Ana',
        notifierEmail: 'ana@example.test',
        goodFaith: true,
        language: 'ro',
      },
      { reference: 'N-000007', receivedAt: '2026-10-25T09:00:00Z' },
      { supportEmail: 'help@example.test', productName: 'Example' },
    );
    expect(emails[0]?.subject).toContain('Am primit raportarea ta');
  });
});
