/**
 * Tests for the Auth Send Email hook (story S1-E11-19): the signature, the template for the
 * action and language, the admins' wording over the file text, the code Supabase made, and a
 * plain error when sending fails.
 */
import { describe, expect, it } from 'vitest';

import type { OutgoingEmail } from './contact';
import { handleSendEmailHook, verifyHookSignature, type SendEmailHookPayload } from './send-email';

/** A test secret in Supabase's format (base64 of "test-secret-key-for-hooks"). */
const secret = `v1,whsec_${btoa('test-secret-key-for-hooks')}`;
const now = 1_793_000_000_000;

/**
 * Signs a body as Supabase does.
 *
 * @returns the three Standard Webhooks headers
 */
async function signed(
  body: string,
  timestamp: number | string = Math.floor(now / 1000),
): Promise<Headers> {
  const keyBytes = Uint8Array.from(atob(btoa('test-secret-key-for-hooks')), (char) =>
    char.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`msg_1.${String(timestamp)}.${body}`),
  );
  return new Headers({
    'webhook-id': 'msg_1',
    'webhook-timestamp': String(timestamp),
    'webhook-signature': `v1,${btoa(String.fromCharCode(...new Uint8Array(signature)))}`,
  });
}

/** A hook call for one action. */
function payloadFor(action: string, locale?: string): SendEmailHookPayload {
  return {
    user: { email: 'reader@example.com', new_email: 'new@example.com', user_metadata: { locale } },
    email_data: {
      token: '123456',
      token_hash: 'hash',
      token_new: '654321',
      email_action_type: action,
      site_url: 'https://example.test',
    },
  };
}

/** Runs the hook and keeps what it sent. */
async function run(
  payload: SendEmailHookPayload,
  overrides = new Map<string, string>(),
  failSend = false,
) {
  const sent: OutgoingEmail[] = [];
  const body = JSON.stringify(payload);
  const response = await handleSendEmailHook(
    new Request('https://example.test/api/send-email', {
      method: 'POST',
      body,
      headers: await signed(body),
    }),
    {
      hookSecret: secret,
      sender: { name: 'Product', email: 'hello@example.test' },
      productName: 'Product',
      companyName: 'Company',
      sendEmail: (email) =>
        failSend ? Promise.reject(new Error('down')) : Promise.resolve(void sent.push(email)),
      readOverrides: () => Promise.resolve(overrides),
      now: () => now,
    },
  );
  return { response, sent };
}

describe('the Send Email hook', () => {
  it('refuses a call that is not signed with our secret', async () => {
    const body = JSON.stringify(payloadFor('signup'));
    const headers = await signed(body);
    expect(await verifyHookSignature(secret, headers, `${body} `, Math.floor(now / 1000))).toBe(
      false,
    );
    expect(await verifyHookSignature(secret, headers, body, Math.floor(now / 1000) + 3600)).toBe(
      false,
    );
    expect(await verifyHookSignature(secret, headers, body, Math.floor(now / 1000))).toBe(true);
  });

  it('refuses a correctly signed call whose time is not a number (QA-1d)', async () => {
    const body = JSON.stringify(payloadFor('signup'));
    // Before QA-1d, NaN slipped past the five-minute check, so a signature over any old call
    // with a broken time was accepted for ever.
    for (const brokenTime of ['abc', '', '1e3x']) {
      const headers = await signed(body, brokenTime);
      expect(await verifyHookSignature(secret, headers, body, Math.floor(now / 1000))).toBe(false);
    }
  });

  it('sends the sign-up email in Romanian by default, with the link Supabase made', async () => {
    const { response, sent } = await run(payloadFor('signup'));
    expect(response.status).toBe(200);
    expect(sent[0]?.subject).toBe('Confirmă-ți adresa de email');
    expect(sent[0]?.text).toContain('https://example.test/auth/confirm?token_hash=hash&type=email');
    expect(sent[0]?.text).toContain('Product');
  });

  it('words the sign-up email "You’re on the list" for someone joining the waiting list (WAITLIST-1)', async () => {
    const payload = payloadFor('signup', 'en');
    payload.user.user_metadata = { locale: 'en', joins_waitlist: true };
    const { sent } = await run(payload);
    expect(sent[0]?.subject).toBe('You’re on the list: confirm your email');
    expect(sent[0]?.text).toContain('https://example.test/auth/confirm?token_hash=hash&type=email');
    expect(sent[0]?.text).toContain('keep your place');
  });

  it("uses the admin's published wording over the file text", async () => {
    const overrides = new Map([['email:confirmation.heading', 'Welcome to {{productName}}']]);
    const { sent } = await run(payloadFor('signup', 'en'), overrides);
    expect(sent[0]?.text.startsWith('Welcome to Product')).toBe(true);
  });

  it('a change of email sends each address its own code', async () => {
    const { sent } = await run(payloadFor('email_change', 'en'));
    expect(sent.map((email) => email.to)).toEqual(['reader@example.com', 'new@example.com']);
    expect(sent[0]?.text).toContain('123456');
    expect(sent[1]?.text).toContain('654321');
  });

  it('an unknown kind of email is refused and a failed send is a plain 500', async () => {
    expect((await run(payloadFor('reauthentication'))).response.status).toBe(400);
    const failed = await run(payloadFor('recovery'), new Map(), true);
    expect(failed.response.status).toBe(500);
    expect(JSON.stringify(await failed.response.json())).not.toContain('reader@example.com');
  });
});
