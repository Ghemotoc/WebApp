/**
 * Unit tests for the staff email about each new person on the waiting list (bundle WAITLIST-2).
 * They cover the worker key, which mailbox the email goes to, what the email says (and never
 * says), and marking only what left. The database is faked with a stubbed fetch; nothing leaves
 * the machine.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  alertMailbox,
  handleWaitlistAlerts,
  waitlistAlertEmail,
  type ClaimedWaitlistAlert,
  type WaitlistAlertOptions,
} from './waitlist-alerts';

const sender = { name: 'App', email: 'support@example.test' };

/** One claimed person, with any field changed. */
function claimedPerson(changes: Partial<ClaimedWaitlistAlert> = {}): ClaimedWaitlistAlert {
  return {
    id: 'entry-1',
    handle: 'inkwolf',
    country_code: 'RO',
    interest: 'both',
    joined_at: '2026-11-21T07:00:00Z',
    alert_to: '',
    ...changes,
  };
}

/** The worker's options with a recording email sender, and any field changed. */
function workerOptions(changes: Partial<WaitlistAlertOptions> = {}) {
  const sent: { to: string; subject: string; text: string }[] = [];
  const options: WaitlistAlertOptions = {
    supabaseUrl: 'https://db.test',
    anonKey: 'anon',
    workerKey: 'worker-key',
    sender,
    productName: 'App',
    companyName: 'Company',
    sendEmail: (email) => {
      sent.push(email);
      return Promise.resolve();
    },
    readOverrides: () => Promise.resolve(new Map()),
    ...changes,
  };
  return { options, sent };
}

/** The database's call, with the given key. */
function workerCall(key: string): Request {
  return new Request('https://site.test/api/waitlist-alerts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('alertMailbox', () => {
  it('sends to the support address while the setting is empty', () => {
    expect(alertMailbox('', sender)).toBe('support@example.test');
  });

  it('sends to the address in the setting once staff set one', () => {
    expect(alertMailbox(' team@example.test ', sender)).toBe('team@example.test');
  });

  it('falls back to the support address when the setting holds no address', () => {
    expect(alertMailbox('not an address', sender)).toBe('support@example.test');
  });
});

describe('waitlistAlertEmail', () => {
  it('names the person, their country and what they came for, and links Staff › Waitlist', async () => {
    const email = await waitlistAlertEmail(
      workerOptions().options,
      claimedPerson(),
      'https://site.test',
    );

    expect(email.subject).toBe('New on the waiting list: @inkwolf · App');
    expect(email.text).toContain('Country: Romania');
    expect(email.text).toContain('Came to: write and read');
    expect(email.text).toContain('https://site.test/staff/waitlist');
  });

  it('says the country is not known when the profile has none', async () => {
    const email = await waitlistAlertEmail(
      workerOptions().options,
      claimedPerson({ country_code: null }),
      'https://site.test',
    );

    expect(email.text).toContain('Country: not known');
  });

  it('uses the wording staff saved over the file text', async () => {
    const overrides = new Map([['email:waitlistAlert.subject', 'Someone new: @{{handle}}']]);
    const { options } = workerOptions({ readOverrides: () => Promise.resolve(overrides) });

    const email = await waitlistAlertEmail(options, claimedPerson(), 'https://site.test');

    expect(email.subject).toBe('Someone new: @inkwolf');
  });
});

describe('handleWaitlistAlerts', () => {
  it('answers 503 while the worker key is not set', async () => {
    const { options } = workerOptions({ workerKey: undefined });

    const response = await handleWaitlistAlerts(workerCall('anything'), options);

    expect(response.status).toBe(503);
  });

  it('refuses a call with the wrong key', async () => {
    const response = await handleWaitlistAlerts(workerCall('wrong'), workerOptions().options);

    expect(response.status).toBe(401);
  });

  it('sends one email per person it claimed and marks only what left', async () => {
    const calls: { url: string; body: string }[] = [];
    vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
      calls.push({ url, body: String(init.body) });
      if (url.endsWith('waitlist_alert_worker_claim')) {
        return Promise.resolve(
          Response.json([claimedPerson(), claimedPerson({ id: 'entry-2', handle: 'broken' })]),
        );
      }
      return Promise.resolve(Response.json(1));
    });
    const { options, sent } = workerOptions({
      sendEmail: (email) => {
        if (email.subject.includes('@broken')) return Promise.reject(new Error('refused'));
        sent.push(email);
        return Promise.resolve();
      },
    });

    const response = await handleWaitlistAlerts(workerCall('worker-key'), options);

    expect(await response.json()).toEqual({ sent: 1, failed: 1 });
    expect(sent.map((email) => email.to)).toEqual(['support@example.test']);
    const markCall = calls.find((call) => call.url.endsWith('waitlist_alert_worker_mark_sent'));
    expect(JSON.parse(markCall?.body ?? '{}')).toEqual({
      worker_key: 'worker-key',
      entry_ids: ['entry-1'],
    });
  });

  it('answers 503 when the database cannot be reached', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('down')));

    const response = await handleWaitlistAlerts(workerCall('worker-key'), workerOptions().options);

    expect(response.status).toBe(503);
  });
});
