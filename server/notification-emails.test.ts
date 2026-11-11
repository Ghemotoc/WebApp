/**
 * Unit tests for the notification emails and the one-click unsubscribe (story S1-E7-02).
 * Who runs it: `npm test`. The database is a fake fetch, so these tests check the worker's own
 * rules: the worker key is needed, each email is in the person's language with its unsubscribe
 * link and headers (none on account, safety and legal emails), the admins' wording wins over the
 * file text, and only the emails that left are marked sent. What the database queues and hands
 * out is pgTAP test 183. Addresses, handles and the product name are made-up examples.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OutgoingEmail } from './contact';
import {
  handleNotificationEmails,
  handleUnsubscribe,
  type ClaimedEmail,
  type EmailNotificationItem,
} from './notification-emails';

const workerKey = 'test-worker-key';
const unsubscribeKey = 'a'.repeat(48);

/** A reply from one person on chapter 3. */
const reply: EmailNotificationItem = {
  kind: 'comment_reply',
  actors: [{ handle: 'corbu', display_name: 'Corbu' }],
  actor_count: 1,
  story: { slug: 'sarea', title: 'Sarea' },
  chapter: { code: 'abcd1234', title: 'Mina', position: 3 },
  comment_excerpt: 'Ce frumos scrii!',
};

/** Three new followers. */
const followers: EmailNotificationItem = {
  kind: 'new_follower',
  actors: [
    { handle: 'ilinca', display_name: 'Ilinca' },
    { handle: 'corbu', display_name: 'Corbu' },
  ],
  actor_count: 3,
  story: null,
  chapter: null,
  comment_excerpt: null,
};

/** One claimed email. */
function claimed(overrides: Partial<ClaimedEmail>): ClaimedEmail {
  return {
    outbox_id: 'outbox-1',
    to: 'ana@example.test',
    language: 'en',
    delivery: 'instant',
    unsubscribe_key: unsubscribeKey,
    items: [reply],
    ...overrides,
  };
}

/** A fake database: answers the claim, and records what was marked sent. */
function fakeDatabase(claimedEmails: ClaimedEmail[], claimStatus = 200) {
  const marked: string[][] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/email_worker_claim')) {
        return new Response(JSON.stringify(claimedEmails), { status: claimStatus });
      }
      marked.push((JSON.parse(String(init.body)) as { outbox_ids: string[] }).outbox_ids);
      return new Response('1', { status: 200 });
    }),
  );
  return marked;
}

/** The options, with a recorder instead of a real sender. */
function options(
  sendEmail: (email: OutgoingEmail) => Promise<void>,
  overrides = new Map<string, string>(),
) {
  return {
    supabaseUrl: 'http://database.test',
    anonKey: 'anon',
    workerKey,
    sender: { name: 'Product', email: 'hello@example.test' },
    productName: 'Product',
    companyName: 'Company',
    sendEmail,
    readOverrides: () => Promise.resolve(overrides),
  };
}

/** The worker's call, with a key or none. */
function postWith(key: string | null): Request {
  const headers: Record<string, string> = key === null ? {} : { Authorization: `Bearer ${key}` };
  return new Request('https://site.test/api/notification-emails', { method: 'POST', headers });
}

/** Runs the worker once and returns what it sent. */
async function sendOnce(claimedEmails: ClaimedEmail[], overrides?: Map<string, string>) {
  fakeDatabase(claimedEmails);
  const sent: OutgoingEmail[] = [];
  await handleNotificationEmails(
    postWith(workerKey),
    options(async (email) => {
      sent.push(email);
    }, overrides),
  );
  return sent;
}

afterEach(() => vi.unstubAllGlobals());

describe('the notification email worker', () => {
  it('refuses a call without the worker key', async () => {
    fakeDatabase([]);
    const response = await handleNotificationEmails(
      postWith('wrong'),
      options(() => Promise.resolve()),
    );
    expect(response.status).toBe(401);
  });

  it('sends nothing while the worker key isn’t set up', async () => {
    const response = await handleNotificationEmails(postWith(workerKey), {
      ...options(() => Promise.resolve()),
      workerKey: undefined,
    });
    expect(response.status).toBe(503);
  });

  it('tells about a reply at once, in English, with the comment and a one-click unsubscribe', async () => {
    const [email] = await sendOnce([claimed({})]);
    expect(email?.subject).toBe('Corbu replied to your comment on chapter 3 of “Sarea”.');
    expect(email?.text).toContain('“Ce frumos scrii!”');
    expect(email?.text).toContain(`https://site.test/unsubscribe?key=${unsubscribeKey}`);
    expect(email?.headers).toEqual({
      'List-Unsubscribe': `<https://site.test/api/unsubscribe?key=${unsubscribeKey}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });

  it('writes a Romanian daily digest with every notification in it', async () => {
    const [email] = await sendOnce([
      claimed({ language: 'ro', delivery: 'daily', items: [reply, followers] }),
    ]);
    expect(email?.subject).toBe('Rezumat zilnic de pe Product');
    expect(email?.text).toContain(
      'Corbu a răspuns la comentariul tău de la capitolul 3 din „Sarea”.',
    );
    expect(email?.text).toContain('Ilinca, Corbu și încă o persoană au început să te urmărească.');
  });

  it('emails a private message by who wrote it and a link to the chat, never the words (IDEAS-2)', async () => {
    const message: EmailNotificationItem = {
      kind: 'new_message',
      actors: [{ handle: 'corbu', display_name: 'Corbu' }],
      actor_count: 2,
      story: null,
      chapter: null,
      comment_excerpt: null,
      is_request: false,
    };
    const [email] = await sendOnce([claimed({ delivery: 'message', items: [message] })]);
    expect(email?.subject).toBe('Corbu sent you 2 private messages.');
    expect(email?.text).toContain('We never put the words of a message in an email');
    expect(email?.text).toContain('Open the chat: https://site.test/messages/corbu');
    expect(email?.text).toContain('https://site.test/settings#messages');
    expect(email?.headers?.['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  it('calls a waiting first message a message request, in Romanian too (IDEAS-2)', async () => {
    const request: EmailNotificationItem = {
      kind: 'new_message',
      actors: [{ handle: 'corbu', display_name: 'Corbu' }],
      actor_count: 1,
      story: null,
      chapter: null,
      comment_excerpt: null,
      is_request: true,
    };
    const [email] = await sendOnce([
      claimed({ language: 'ro', delivery: 'message', items: [request] }),
    ]);
    expect(email?.subject).toBe('Corbu ți-a trimis o cerere de mesaj.');
    expect(email?.text).toContain('Deschide conversația: https://site.test/messages/corbu');
  });

  it('sends a moderation decision without an unsubscribe link, saying it is always sent', async () => {
    const decision: EmailNotificationItem = {
      ...followers,
      kind: 'moderation_decision',
      actors: [],
      actor_count: 0,
    };
    const [email] = await sendOnce([
      claimed({ delivery: 'required', unsubscribe_key: null, items: [decision] }),
    ]);
    expect(email?.subject).toBe('A moderation decision about something you posted');
    expect(email?.text).toContain('we always send it');
    expect(email?.text).not.toContain('/unsubscribe');
    expect(email?.headers).toBeUndefined();
  });

  it('sends a new way to log in with its own subject, never naming which one (S1-E2-09)', async () => {
    const loginMethod: EmailNotificationItem = {
      ...followers,
      kind: 'login_method_added',
      actors: [],
      actor_count: 0,
    };
    const [email] = await sendOnce([
      claimed({ delivery: 'required', unsubscribe_key: null, items: [loginMethod] }),
    ]);
    expect(email?.subject).toBe('A change to how you log in to Product');
    expect(email?.text).toContain('A new way to log in was connected to your account.');
    expect(email?.text).not.toMatch(/Google|Apple|Microsoft|passkey/);
    expect(email?.text).toContain('we always send it');
    expect(email?.headers).toBeUndefined();
  });

  it('sends "You’re in" always, with a link to log in and no code (WAITLIST-1)', async () => {
    const admitted: EmailNotificationItem = {
      ...followers,
      kind: 'waitlist_admitted',
      actors: [],
      actor_count: 0,
    };
    const [email] = await sendOnce([
      claimed({ delivery: 'required', unsubscribe_key: null, items: [admitted] }),
    ]);
    expect(email?.subject).toBe('You’re in: the Product account is open');
    expect(email?.text).toContain('Your place came up');
    expect(email?.text).toMatch(/Log in to start: \S+\/sign-in/);
    expect(email?.text).toContain('we always send it');
    expect(email?.headers).toBeUndefined();
  });

  it('warns about a month and about a week before deleting an unused account, with a link to log in (INACTIVE-1)', async () => {
    const unused = (kind: EmailNotificationItem['kind']): EmailNotificationItem => ({
      ...followers,
      kind,
      actors: [],
      actor_count: 0,
    });
    const [monthEmail, weekEmail] = await sendOnce([
      claimed({
        delivery: 'required',
        unsubscribe_key: null,
        items: [unused('account_unused_month')],
      }),
      claimed({
        delivery: 'required',
        unsubscribe_key: null,
        items: [unused('account_unused_week')],
      }),
    ]);
    expect(monthEmail?.subject).toBe('The Product account will be deleted in about a month');
    expect(monthEmail?.text).toContain('almost 5 years');
    expect(monthEmail?.text).toMatch(/Log in to keep it: \S+\/sign-in/);
    expect(monthEmail?.text).toContain('we always send it');
    expect(monthEmail?.headers).toBeUndefined();
    expect(weekEmail?.subject).toBe(
      'Last notice: the Product account will be deleted in about a week',
    );
    expect(weekEmail?.text).toContain('in about a week');
  });

  it('tells a teacher their class is archived, always, naming the class (S1-E8-12)', async () => {
    const archived: EmailNotificationItem = {
      ...followers,
      kind: 'class_archived',
      actors: [],
      actor_count: 0,
      space: { slug: 'clasa-a-vii-a', name: 'Clasa a VII-a' },
    };
    const [email] = await sendOnce([
      claimed({ delivery: 'required', unsubscribe_key: null, items: [archived] }),
    ]);
    expect(email?.subject).toBe('Your class space is archived: keep copies of its certificates');
    expect(email?.text).toContain('“Clasa a VII-a” is archived');
    expect(email?.text).toContain('within 30 days');
    expect(email?.headers).toBeUndefined();
  });

  it('tells the person a data request needs more time, with the date and the reason (S1-E11-09)', async () => {
    const extended: EmailNotificationItem = {
      ...followers,
      kind: 'data_request_extended',
      actors: [],
      actor_count: 0,
      data_request: {
        reference: 'D-000007',
        deadline: '2027-04-28',
        extension_reason: 'Many stories to gather.',
      },
    };
    const [email] = await sendOnce([
      claimed({ delivery: 'required', unsubscribe_key: null, items: [extended] }),
    ]);
    expect(email?.subject).toBe('We need more time for your data request');
    expect(email?.text).toContain('data request D-000007');
    expect(email?.text).toContain('by 28 April 2027');
    expect(email?.text).toContain('Why: Many stories to gather.');
    expect(email?.headers).toBeUndefined();
  });

  it('asks the person, always, whether a data request was theirs (S1-E11-09)', async () => {
    const confirm: EmailNotificationItem = {
      ...followers,
      kind: 'data_request_confirm',
      actors: [],
      actor_count: 0,
      data_request: { reference: 'D-000008', deadline: '2027-02-28', extension_reason: null },
    };
    const [email] = await sendOnce([
      claimed({ delivery: 'required', unsubscribe_key: null, items: [confirm] }),
    ]);
    expect(email?.subject).toBe('Did you send this data request?');
    expect(email?.text).toContain('(D-000008)');
    expect(email?.text).toContain('Settings, under Data requests');
  });

  it('tells the person, always, that the copy of their data is ready, never sending it (S1-E11-09)', async () => {
    const ready: EmailNotificationItem = {
      ...followers,
      kind: 'data_request_copy_ready',
      actors: [],
      actor_count: 0,
      data_request: { reference: 'D-000009', deadline: '2027-02-28', extension_reason: null },
    };
    const [email] = await sendOnce([
      claimed({ delivery: 'required', unsubscribe_key: null, items: [ready] }),
    ]);
    expect(email?.subject).toBe('The data copy is ready');
    expect(email?.text).toContain('(D-000009)');
    expect(email?.text).toContain('seven days');
    expect(email?.text).toContain('We never send your data by email.');
    expect(email?.headers).toBeUndefined();
  });

  it('uses the admins’ wording when there is an override', async () => {
    const overrides = new Map([
      ['email:notificationEmails.subjectDigest', 'Today on {{productName}}'],
    ]);
    const [email] = await sendOnce([claimed({ delivery: 'daily' })], overrides);
    expect(email?.subject).toBe('Today on Product');
  });

  it('marks only the emails that left', async () => {
    const marked = fakeDatabase([
      claimed({}),
      claimed({ outbox_id: 'outbox-2', to: 'bad@example.test' }),
    ]);
    const response = await handleNotificationEmails(
      postWith(workerKey),
      options((email) =>
        email.to === 'bad@example.test' ? Promise.reject(new Error('down')) : Promise.resolve(),
      ),
    );
    expect(await response.json()).toEqual({ sent: 1, failed: 1 });
    expect(marked).toEqual([['outbox-1']]);
  });

  it('answers 503 when the database can’t be reached', async () => {
    fakeDatabase([], 500);
    const response = await handleNotificationEmails(
      postWith(workerKey),
      options(() => Promise.resolve()),
    );
    expect(response.status).toBe(503);
  });
});

describe('the one-click unsubscribe', () => {
  /** A fake database that knows one key. */
  function fakeKeys() {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { unsubscribe_key: string };
        return new Response(JSON.stringify(body.unsubscribe_key === unsubscribeKey));
      }),
    );
  }
  const database = { supabaseUrl: 'http://database.test', anonKey: 'anon' };

  it('stops the emails for a known key', async () => {
    fakeKeys();
    const response = await handleUnsubscribe(
      new Request(`https://site.test/api/unsubscribe?key=${unsubscribeKey}`, { method: 'POST' }),
      database,
    );
    expect(response.status).toBe(200);
  });

  it('answers 404 for an unknown key and 405 for anything but POST', async () => {
    fakeKeys();
    const unknown = await handleUnsubscribe(
      new Request('https://site.test/api/unsubscribe?key=nope', { method: 'POST' }),
      database,
    );
    const opened = await handleUnsubscribe(
      new Request(`https://site.test/api/unsubscribe?key=${unsubscribeKey}`),
      database,
    );
    expect(unknown.status).toBe(404);
    expect(opened.status).toBe(405);
  });
});
