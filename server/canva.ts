/**
 * "Design it in Canva": our server's side (story S1-E3-12; ADR 0009).
 *
 * The addresses, all under /api/canva/:
 * - POST design { storyId, storyTitle, codeChallenge, state }: when the writer has connected
 *   Canva, a new blank 1600 × 2560 design and its edit address (criterion 1); otherwise Canva's
 *   consent page with our PKCE challenge, so nothing is shared before they agree (criterion 4);
 * - POST connect { code, codeVerifier }: swaps the consent page's code for the writer's tokens
 *   and saves them encrypted;
 * - POST return { correlationJwt }: checks Canva's return token and exports the design as a PNG,
 *   which the tab then uploads as the cover through the normal picture check (criteria 2 and 3);
 * - POST disconnect: tells Canva to forget the tokens and removes the connection (Settings);
 * - GET stub/authorize and stub/editor: the stand-in's own pages, only while CANVA isn't "real".
 * Every call acts as the writer with their own sign-in token, never a service key (CLAUDE.md
 * rule 2), and nothing about the writer or their design is logged (rule 12).
 * Who calls it: functions/api/canva/[[path]].ts on Cloudflare, server/pages-functions-plugin.ts
 * locally; the pages in src/features/canva/ call the addresses.
 */
import {
  CANVA_STORY_HEADER,
  canvaConnectRequestSchema,
  canvaDesignRequestSchema,
  canvaReturnRequestSchema,
  type CanvaDesignResponse,
  type CanvaFailure,
} from '../src/schemas/canva';

import {
  isCanvaOn,
  readTokens,
  removeConnection,
  saveTokens,
  usableAccessToken,
  type DatabaseAccess,
} from './canva/connection';
import { canvaService, usesStandIn, type CanvaSettings } from './canva/index';
import { standInConsentPage, standInEditorPage } from './canva/stub';
import { tokenKeyFrom } from './canva/tokens';
import type { CanvaService } from './canva/types';
import { bearerToken } from './picture-check';

/** What the handler needs from its surroundings. */
export interface CanvaOptions {
  supabaseUrl: string;
  anonKey: string;
  /** CANVA_TOKEN_KEY: 32 random bytes as base64. */
  tokenSecret: string | undefined;
  settings: CanvaSettings;
}

/** Everything one request works with. */
interface CanvaRequestContext {
  access: DatabaseAccess;
  key: CryptoKey;
  canva: CanvaService;
  /** Where Canva sends the tab back: our own /canva/return page. */
  redirectUri: string;
}

/**
 * The stand-in's own key, so a stand-in set-up works without CANVA_TOKEN_KEY. Stand-in tokens
 * open nothing, so this key protects nothing; real mode always needs the secret.
 */
const standInTokenSecret = 'c3RhbmQtaW4tdG9rZW4ta2V5LW5vdC1hLXNlY3JldCE';

/** The answer's HTTP status for each failure. */
const statusForFailure: Record<CanvaFailure, number> = {
  invalid: 400,
  signed_out: 401,
  account: 403,
  switched_off: 403,
  not_connected: 409,
  declined: 422,
  expired: 422,
  export_failed: 502,
  unavailable: 503,
  unreachable: 503,
};

/**
 * A JSON answer that no cache keeps.
 *
 * @returns the response
 */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * A failure as JSON with its status.
 *
 * @returns the response
 */
function fail(failure: CanvaFailure): Response {
  return json({ error: failure }, statusForFailure[failure]);
}

/**
 * The request's body checked against a schema.
 *
 * @returns the checked body, or null
 */
async function readBody<T>(
  request: Request,
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
): Promise<T | null> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}

/**
 * POST design: a new design for a connected writer, or Canva's consent page.
 *
 * @returns { kind: 'design', editUrl } or { kind: 'connect', authorizeUrl }
 */
async function design(request: Request, context: CanvaRequestContext): Promise<Response> {
  const body = await readBody(request, canvaDesignRequestSchema);
  if (body === null) return fail('invalid');
  if (!(await isCanvaOn(context.access))) return fail('switched_off');
  const accessToken = await usableAccessToken(context.access, context.key, context.canva);
  if (accessToken === null) {
    const authorizeUrl = context.canva.authorizeUrl({
      redirectUri: context.redirectUri,
      codeChallenge: body.codeChallenge,
      state: body.state,
    });
    return json({ kind: 'connect', authorizeUrl } satisfies CanvaDesignResponse, 200);
  }
  const created = await context.canva.createDesign(accessToken, body.storyTitle);
  if (created === null) return fail('unreachable');
  // The story's ID rides along as the correlation state and comes back in Canva's return token.
  const editUrl = new URL(created.editUrl);
  editUrl.searchParams.set('correlation_state', body.storyId);
  return json({ kind: 'design', editUrl: editUrl.toString() } satisfies CanvaDesignResponse, 200);
}

/**
 * POST connect: the consent page's code for tokens, saved encrypted.
 *
 * @returns { connected: true }, or why not
 */
async function connect(request: Request, context: CanvaRequestContext): Promise<Response> {
  const body = await readBody(request, canvaConnectRequestSchema);
  if (body === null) return fail('invalid');
  const tokens = await context.canva.exchangeCode({
    code: body.code,
    codeVerifier: body.codeVerifier,
    redirectUri: context.redirectUri,
  });
  if (tokens === null) return fail('declined');
  const failure = await saveTokens(context.access, context.key, tokens);
  if (failure !== null) return fail(failure);
  return json({ connected: true }, 200);
}

/**
 * POST return: checks Canva's return token and exports the design.
 *
 * @returns the PNG, with the story's ID in the X-Story-Id header; or why not
 */
async function bringBack(request: Request, context: CanvaRequestContext): Promise<Response> {
  const body = await readBody(request, canvaReturnRequestSchema);
  if (body === null) return fail('invalid');
  const returned = await context.canva.verifyReturn(body.correlationJwt);
  if (returned === null) return fail('expired');
  const accessToken = await usableAccessToken(context.access, context.key, context.canva);
  if (accessToken === null) return fail('not_connected');
  const png = await context.canva.exportPng(accessToken, returned.designId);
  if (png === null) return fail('export_failed');
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      [CANVA_STORY_HEADER]: returned.correlationState,
    },
  });
}

/**
 * POST disconnect: Canva forgets the tokens (best effort), then the connection goes.
 *
 * @returns { disconnected: true }, or unreachable when the database refused
 */
async function disconnect(context: CanvaRequestContext): Promise<Response> {
  const tokens = await readTokens(context.access, context.key);
  if (tokens !== null) await context.canva.revoke(tokens.refreshToken);
  if (!(await removeConnection(context.access))) return fail('unreachable');
  return json({ disconnected: true }, 200);
}

/**
 * The stand-in's pages, only while CANVA isn't "real".
 *
 * @returns the page, or a 404
 */
async function standInPage(route: string, request: Request, options: CanvaOptions) {
  const origin = new URL(request.url).origin;
  if (!usesStandIn(options.settings)) return new Response('Not found', { status: 404 });
  if (route === 'stub/authorize') return standInConsentPage(request, origin);
  if (route === 'stub/editor') return standInEditorPage(request, origin);
  return new Response('Not found', { status: 404 });
}

/**
 * Builds one request's context: the service, the key and the writer's token.
 *
 * @returns the context, or the failure to answer
 */
async function contextFor(
  request: Request,
  options: CanvaOptions,
): Promise<CanvaRequestContext | CanvaFailure> {
  const origin = new URL(request.url).origin;
  const canva = canvaService(options.settings, origin);
  const secret = usesStandIn(options.settings)
    ? (options.tokenSecret ?? standInTokenSecret)
    : options.tokenSecret;
  const key = await tokenKeyFrom(secret);
  if (canva === null || key === null) return 'unavailable';
  const token = bearerToken(request);
  if (token === null) return 'signed_out';
  return {
    access: { supabaseUrl: options.supabaseUrl, anonKey: options.anonKey, token },
    key,
    canva,
    redirectUri: `${origin}/canva/return`,
  };
}

/**
 * Answers every /api/canva/… address.
 *
 * @param request - the request
 * @param options - the database, the token key and which Canva to use
 * @returns the answer for that address (see the file's header); 404 for an unknown one
 * Errors: none thrown; nothing is logged.
 */
export async function handleCanva(request: Request, options: CanvaOptions): Promise<Response> {
  const route = new URL(request.url).pathname.replace(/^\/api\/canva\/?/, '');
  if (request.method === 'GET') return standInPage(route, request, options);
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const context = await contextFor(request, options);
  if (typeof context === 'string') return fail(context);
  if (route === 'design') return design(request, context);
  if (route === 'connect') return connect(request, context);
  if (route === 'return') return bringBack(request, context);
  if (route === 'disconnect') return disconnect(context);
  return new Response('Not found', { status: 404 });
}
