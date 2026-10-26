/**
 * Unit tests for the decision emails to people who used the public form (story S1-E10-04).
 * Who runs it: `npm test`. The database is a fake fetch, so these tests check the handler's own
 * rules: a token is needed, each email goes in the notifier's language with the outcome only, and
 * only the emails that left are marked sent. What the database lets a moderator send is pgTAP
 * test 161. Addresses and the product name are made-up examples.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OutgoingEmail } from './contact';
import { decisionEmail, handleDecisionEmails, type DueDecisionEmail } from './decision-emails';

const due: DueDecisionEmail = {
  notice_id: 'notice-1',
  reference: 'N-000123',
  kind: 'notice',
  language: 'ro',
  notifier_email: 'ana@example.test',
  outcome: 'removed',
  decided_at: '2026-10-30T09:00:00Z',
};

/** A fake database: answers the due list, and records what was marked sent. */
function fakeDatabase(dueEmails: DueDecisionEmail[], dueStatus = 200) {
  const marked: string[][] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/admin_due_decision_emails')) {
        return new Response(JSON.stringify(dueEmails), { status: dueStatus });
      }
      marked.push((JSON.parse(String(init.body)) as { notice_ids: string[] }).notice_ids);
      return new Response('1', { status: 200 });
    }),
  );
  return marked;
}

/** The options, with a recorder instead of a real sender. */
function options(sendEmail: (email: OutgoingEmail) => Promise<void>) {
  return {
    supabaseUrl: 'http://database.test',
    anonKey: 'anon',
    supportEmail: 'hello@example.test',
    productName: 'Product',
    sendEmail,
  };
}

/** A request with the moderator's token, or none. */
function postWith(token: string | null): Request {
  const headers: Record<string, string> =
    token === null ? {} : { Authorization: `Bearer ${token}` };
  return new Request('http://localhost/api/decision-emails', { method: 'POST', headers });
}

afterEach(() => vi.unstubAllGlobals());

describe('the decision email', () => {
  it('tells a Romanian notifier in Romanian that the content was removed', () => {
    const email = decisionEmail(due, 'Product');
    expect(email.to).toBe('ana@example.test');
    expect(email.subject).toContain('N-000123');
    expect(email.text).toContain('Am eliminat conținutul raportat de tine.');
    expect(email.text).toContain('șase luni');
  });

  it('never names a sanction, only the outcome', () => {
    const email = decisionEmail({ ...due, language: 'en', outcome: 'acted' }, 'Product');
    expect(email.text).toContain('We took action on the content you reported.');
    expect(email.text).not.toMatch(/ban|suspen|warn/i);
  });

  it('confirms a removal order to the authority with the time and the preservation', () => {
    const email = decisionEmail({ ...due, kind: 'removal_order', language: 'en' }, 'Product');
    expect(email.text).toContain('no longer available anywhere');
    expect(email.text).toContain('2021/784 art. 6');
  });
});

describe('POST /api/decision-emails', () => {
  it('needs the moderator to be signed in', async () => {
    fakeDatabase([due]);
    const response = await handleDecisionEmails(
      postWith(null),
      options(async () => {}),
    );
    expect(response.status).toBe(401);
  });

  it('says forbidden when the database refuses the caller', async () => {
    fakeDatabase([], 403);
    const response = await handleDecisionEmails(
      postWith('member-token'),
      options(async () => {}),
    );
    expect(response.status).toBe(403);
  });

  it('marks sent only the emails that left', async () => {
    const marked = fakeDatabase([
      due,
      { ...due, notice_id: 'notice-2', notifier_email: 'fails@example.test' },
    ]);
    const sendEmail = async (email: OutgoingEmail) => {
      if (email.to === 'fails@example.test') throw new Error('refused');
    };
    const response = await handleDecisionEmails(postWith('moderator-token'), options(sendEmail));
    expect(await response.json()).toEqual({ sent: 1, failed: 1 });
    expect(marked).toEqual([['notice-1']]);
  });
});
