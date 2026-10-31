/**
 * Unit tests for the Teacher badge's school email link (story S1-E2-11).
 * Who runs it: `npm test`. The database is a fake fetch, so these tests check the server's own
 * rules: a sign-in and a valid address are needed, only the domain and the token's hash reach the
 * database (signed), the link goes to the school address after "#", the database's refusals come
 * back as the screen's reasons, and nothing is sent without the secret. What the database does
 * with it is pgTAP test 204. Addresses are made-up examples.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { OutgoingEmail } from './contact';
import { hmacHex } from './signup-context';
import { handleTeacherCheck, type TeacherCheckOptions } from './teacher-check';

/** A sign-in token whose payload names the user; the fake database never checks the rest. */
const userId = '00000000-0000-4000-8000-000000000001';
const accessToken = `header.${btoa(JSON.stringify({ sub: userId }))}.signature`;

/** What the fake database was sent. */
interface StoredCall {
  school_domain: string;
  token_hash: string;
  signature: string;
}

/** A fake database that answers begin_teacher_email_check() with a status and body. */
function fakeDatabase(status: number, body: unknown): StoredCall[] {
  const calls: StoredCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(String(init.body)) as StoredCall);
      return new Response(JSON.stringify(body), { status });
    }),
  );
  return calls;
}

/** The options, with a recorder instead of a real sender. */
function options(sent: OutgoingEmail[], secret: string | undefined = 'test-secret') {
  const handlerOptions: TeacherCheckOptions = {
    supabaseUrl: 'http://database.test',
    anonKey: 'anon',
    secret,
    sender: { name: 'Product', email: 'hello@example.test' },
    productName: 'Product',
    companyName: 'Company',
    sendEmail: async (email) => {
      sent.push(email);
    },
    readOverrides: () => Promise.resolve(new Map()),
  };
  return handlerOptions;
}

/** A request for a link. */
function linkRequest(body: unknown, token: string | null = accessToken): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  return new Request('https://site.test/api/teacher-check/link', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const goodBody = { schoolEmail: 'Ana.Pop@Liceul-1.edu.ro', language: 'en' };

afterEach(() => vi.unstubAllGlobals());

describe('the school email link', () => {
  it('stores only the domain and a signed hash, and sends the link to the school address', async () => {
    const calls = fakeDatabase(200, { outcome: 'ok', link_expires_at: '2026-11-10T10:00:00Z' });
    const sent: OutgoingEmail[] = [];
    const response = await handleTeacherCheck(linkRequest(goodBody), options(sent));
    expect(response.status).toBe(200);
    const call = calls[0];
    expect(call?.school_domain).toBe('liceul-1.edu.ro');
    expect(JSON.stringify(call)).not.toContain('ana.pop');
    expect(call?.signature).toBe(
      await hmacHex(`teacher|${userId}|liceul-1.edu.ro|${call?.token_hash ?? ''}`, 'test-secret'),
    );
    expect(sent[0]?.to).toBe('ana.pop@liceul-1.edu.ro');
    expect(sent[0]?.subject).toBe('Confirm your school address for Product');
    expect(sent[0]?.text).toMatch(
      /https:\/\/site\.test\/teacher-check\/confirm#[A-Za-z0-9_-]{40,}/,
    );
  });

  it('refuses a request without a sign-in', async () => {
    fakeDatabase(200, {});
    const response = await handleTeacherCheck(linkRequest(goodBody, null), options([]));
    expect(response.status).toBe(401);
  });

  it('refuses something that isn’t an email address', async () => {
    fakeDatabase(200, {});
    const response = await handleTeacherCheck(
      linkRequest({ schoolEmail: 'not an address', language: 'en' }),
      options([]),
    );
    expect(response.status).toBe(400);
  });

  it('passes on the database’s refusal of a personal address, sending nothing', async () => {
    fakeDatabase(400, { code: '23514', hint: 'personal_address' });
    const sent: OutgoingEmail[] = [];
    const response = await handleTeacherCheck(
      linkRequest({ schoolEmail: 'ana@gmail.com', language: 'ro' }),
      options(sent),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'personal_address' });
    expect(sent).toHaveLength(0);
  });

  it('answers 503 without the secret and 404 for any other address', async () => {
    fakeDatabase(200, {});
    const withoutSecret = await handleTeacherCheck(linkRequest(goodBody), options([], undefined));
    const unknown = await handleTeacherCheck(
      new Request('https://site.test/api/teacher-check/other', { method: 'POST' }),
      options([]),
    );
    expect(withoutSecret.status).toBe(503);
    expect(unknown.status).toBe(404);
  });
});
