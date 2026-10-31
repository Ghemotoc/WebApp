/**
 * Unit tests for the "Design it in Canva" handler (story S1-E3-12; ADR 0009), with the stand-in
 * Canva and a fake database kept in memory. They check the handler's own rules: the schema, the
 * caller's own token, connect before design (criterion 4), the encrypted save, Return checked and
 * exported as a PNG (criterion 2), and disconnect. The database's checks are in pgTAP test 187.
 * Who runs it: `npm test`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleCanva, type CanvaOptions } from './canva';
import { STAND_IN_CODE } from './canva/stub';

const storyId = '11111111-1111-4111-8111-111111111111';
const pkce = 'a'.repeat(43);
const options: CanvaOptions = {
  supabaseUrl: 'http://db',
  anonKey: 'anon',
  tokenSecret: undefined,
  settings: { mode: 'stub' },
};

/** The fake database: the flag, one connection row and what was asked of it. */
interface FakeDatabase {
  flagOn: boolean;
  row: Record<string, string> | null;
  authorizations: string[];
}

let database: FakeDatabase;

/** Answers the few database addresses the handler uses. */
async function fakeFetch(address: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  database.authorizations.push(headers.get('Authorization') ?? '');
  if (address.includes('/feature_flags')) return Response.json([{ is_enabled: database.flagOn }]);
  if (address.includes('/canva_connections')) {
    return Response.json(database.row === null ? [] : [database.row]);
  }
  return fakeFunction(address, init);
}

/** Answers the two database functions the handler calls. */
function fakeFunction(address: string, init?: RequestInit): Response {
  if (address.endsWith('/rpc/save_canva_connection')) {
    if (!database.flagOn) return Response.json({ code: '0A000' }, { status: 400 });
    const body = JSON.parse(String(init?.body)) as Record<string, string>;
    database.row = {
      access_token_ciphertext: body.access_ciphertext ?? '',
      refresh_token_ciphertext: body.refresh_ciphertext ?? '',
      access_expires_at: body.access_expires ?? '',
    };
    return new Response(null, { status: 204 });
  }
  if (address.endsWith('/rpc/disconnect_canva')) {
    database.row = null;
    return Response.json(true);
  }
  return new Response('unexpected', { status: 500 });
}

/** A request from our Canva pages. */
function post(route: string, body: unknown, token: string | null = 'writer-token'): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  return new Request(`http://localhost:5173/api/canva/${route}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/** The design request for the test story. */
const designBody = { storyId, storyTitle: 'Stația meteo', codeChallenge: pkce, state: pkce };

beforeEach(() => {
  database = { flagOn: true, row: null, authorizations: [] };
  vi.stubGlobal('fetch', vi.fn(fakeFetch));
});
afterEach(() => vi.unstubAllGlobals());

/** Connects through the stand-in's code. */
async function connectWriter() {
  return handleCanva(post('connect', { code: STAND_IN_CODE, codeVerifier: pkce }), options);
}

describe('the Canva handler', () => {
  it('refuses a bad request, a signed-out writer and a switched-off flag', async () => {
    expect((await handleCanva(post('design', { storyId: 'x' }), options)).status).toBe(400);
    expect((await handleCanva(post('design', designBody, null), options)).status).toBe(401);
    database.flagOn = false;
    const off = await handleCanva(post('design', designBody), options);
    expect(off.status).toBe(403);
    expect(await off.json()).toEqual({ error: 'switched_off' });
  });

  it('sends a writer who has not connected to the consent page first, sharing nothing', async () => {
    const response = await handleCanva(post('design', designBody), options);
    const answer = (await response.json()) as { kind: string; authorizeUrl: string };
    expect(answer.kind).toBe('connect');
    expect(answer.authorizeUrl).toBe(
      `http://localhost:5173/api/canva/stub/authorize?state=${pkce}`,
    );
    expect(database.row).toBeNull();
  });

  it('saves the tokens encrypted, as the writer, and then opens a new design', async () => {
    expect((await connectWriter()).status).toBe(200);
    expect(database.row?.access_token_ciphertext?.startsWith('v1.')).toBe(true);
    expect(JSON.stringify(database.row)).not.toContain('stand-in-access');
    expect(database.authorizations.every((value) => value === 'Bearer writer-token')).toBe(true);
    const response = await handleCanva(post('design', designBody), options);
    const answer = (await response.json()) as { kind: string; editUrl: string };
    expect(answer.kind).toBe('design');
    expect(new URL(answer.editUrl).searchParams.get('correlation_state')).toBe(storyId);
  });

  it('refuses a code Canva did not give', async () => {
    const response = await handleCanva(
      post('connect', { code: 'made-up', codeVerifier: pkce }),
      options,
    );
    expect(await response.json()).toEqual({ error: 'declined' });
    expect(database.row).toBeNull();
  });

  it('brings the design back as a PNG for the right story after Return', async () => {
    await connectWriter();
    const design = (await (await handleCanva(post('design', designBody), options)).json()) as {
      editUrl: string;
    };
    const editor = await handleCanva(new Request(design.editUrl), options);
    const returnLink = /href="([^"]+)"/.exec(await editor.text())?.[1]?.replaceAll('&amp;', '&');
    const correlationJwt = new URL(returnLink ?? '').searchParams.get('correlation_jwt');
    const response = await handleCanva(post('return', { correlationJwt }), options);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('X-Story-Id')).toBe(storyId);
    expect(new Uint8Array(await response.arrayBuffer()).slice(1, 4)).toEqual(
      new TextEncoder().encode('PNG'),
    );
  });

  it('refuses a return token that is made up', async () => {
    await connectWriter();
    const response = await handleCanva(post('return', { correlationJwt: 'a.b.c' }), options);
    expect(await response.json()).toEqual({ error: 'expired' });
  });

  it('removes the connection on disconnect, even with the flag off', async () => {
    await connectWriter();
    database.flagOn = false;
    const response = await handleCanva(post('disconnect', {}), options);
    expect(await response.json()).toEqual({ disconnected: true });
    expect(database.row).toBeNull();
  });

  it("serves the stand-in's pages only in stand-in mode, and needs settings in real mode", async () => {
    const page = new Request(`http://localhost:5173/api/canva/stub/authorize?state=${pkce}`);
    expect((await handleCanva(page, options)).status).toBe(200);
    const real: CanvaOptions = { ...options, settings: { mode: 'real' } };
    expect((await handleCanva(page, real)).status).toBe(404);
    const unset = await handleCanva(post('design', designBody), real);
    expect(await unset.json()).toEqual({ error: 'unavailable' });
  });
});
