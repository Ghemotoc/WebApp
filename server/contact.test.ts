/**
 * Unit tests for the Contact us handler (story S1-E14-04).
 * Who runs it: `npm test`. Each test reads as a sentence about one message.
 * The product name and addresses here are made-up examples: real brand values live only in
 * src/config/brand.ts (CLAUDE.md, names and domains are settings).
 */
import { describe, expect, it } from 'vitest';

import { handleContact, makeContactReference, staffEmail, type OutgoingEmail } from './contact';

const now = new Date('2026-10-23T12:00:00Z');
const digits = () => '0482';

/** A request with the given JSON body, as the form sends it. */
function postJson(body: unknown): Request {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Collects the emails instead of sending them. */
function recorder() {
  const sent: { email: OutgoingEmail; fromName: string }[] = [];
  return {
    sent,
    sendEmail: async (email: OutgoingEmail, from: { name: string }) => {
      sent.push({ email, fromName: from.name });
    },
  };
}

const message = {
  topic: 'account',
  message: 'I can’t change my pen name.',
  email: 'lia@example.com',
  language: 'ro',
  handle: 'adult_writer',
  userId: '00000000-0000-4000-8000-000000000001',
};

describe('the reference', () => {
  it('is C-<year>-<four digits>', () => {
    expect(makeContactReference(now, digits)).toBe('C-2026-0482');
  });
});

describe('the staff email', () => {
  it('names the topic in the subject, the username and user ID in the body, and replies to the sender', () => {
    const email = staffEmail(
      { ...message, topic: 'account', language: 'ro' },
      'C-2026-0482',
      'hello@example.test',
    );
    expect(email.to).toBe('hello@example.test');
    expect(email.replyTo).toBe('lia@example.com');
    expect(email.subject).toBe('[C-2026-0482] Account problem');
    expect(email.text).toContain('@adult_writer (user ID 00000000-0000-4000-8000-000000000001)');
    expect(email.text).toContain('I can’t change my pen name.');
    expect(email.text).not.toMatch(/birth|age check/i);
  });

  it('says "not signed in" for a visitor', () => {
    const visitor = {
      topic: 'question',
      message: 'Hi',
      email: 'lia@example.com',
      language: 'en',
    } as const;
    expect(staffEmail(visitor, 'C-2026-0001', 'x@y.test').text).toContain(
      'lia@example.com (not signed in)',
    );
  });
});

describe('handleContact', () => {
  it('sends the staff email and a Romanian acknowledgement with the reference, and answers it', async () => {
    const mail = recorder();
    const response = await handleContact(postJson(message), {
      supportEmail: 'hello@example.test',
      productName: 'Example Stories',
      sendEmail: mail.sendEmail,
      randomDigits: digits,
      now,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reference: 'C-2026-0482' });
    expect(mail.sent).toHaveLength(2);
    expect(mail.sent[0]?.email.to).toBe('hello@example.test');
    expect(mail.sent[1]?.email.to).toBe('lia@example.com');
    expect(mail.sent[1]?.email.subject).toContain('Am primit mesajul tău (C-2026-0482)');
    expect(mail.sent[1]?.email.text).toContain('în cel mult o lună');
    expect(mail.sent[1]?.fromName).toBe('Example Stories team');
  });

  it('refuses a message that fails the schema with 400 and sends nothing', async () => {
    const mail = recorder();
    const response = await handleContact(postJson({ ...message, email: 'not-an-email' }), {
      supportEmail: 'x@y.test',
      productName: 'Example Stories',
      sendEmail: mail.sendEmail,
    });
    expect(response.status).toBe(400);
    expect(mail.sent).toHaveLength(0);
  });

  it('gives a bot that filled the hidden field a reference and sends nothing', async () => {
    const mail = recorder();
    const response = await handleContact(postJson({ ...message, website: 'http://spam.example' }), {
      supportEmail: 'x@y.test',
      productName: 'Example Stories',
      sendEmail: mail.sendEmail,
      randomDigits: digits,
      now,
    });
    expect(response.status).toBe(200);
    expect(mail.sent).toHaveLength(0);
  });

  it('answers 502 when the email service fails, so the form can say so', async () => {
    const response = await handleContact(postJson(message), {
      supportEmail: 'x@y.test',
      productName: 'Example Stories',
      sendEmail: () => Promise.reject(new Error('down')),
    });
    expect(response.status).toBe(502);
  });
});
