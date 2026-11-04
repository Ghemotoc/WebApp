/**
 * The real Canva Connect API (story S1-E3-12; ADR 0009). Used only when CANVA is "real".
 *
 * Addresses and shapes are from Canva's Connect API documentation as read on 3 Nov 2026; the
 * story says to check them before relying on them, so they are a GO-LIVE item
 * (by-hand-for-robert.md). OAuth uses PKCE (S256) with our client ID and secret; the secret
 * never leaves the server. Nothing about the writer or their design is logged (CLAUDE.md rule 12).
 * Cover templates (IDEAS-2e) use Canva's autofill of brand templates. Canva has offered brand
 * templates and autofill only to Canva Enterprise accounts, so whether writers' own accounts can
 * use our templates is checked at GO-LIVE; until then, and whenever autofill fails, the writer
 * gets the blank cover.
 * Who calls it: server/canva/index.ts.
 */
import type { CanvaTemplateKey } from '../../src/schemas/canva';

import { verifyCanvaJwt, type PublicJwk } from './jwt';
import {
  COVER_HEIGHT,
  COVER_WIDTH,
  type CanvaDesign,
  type CanvaDesignStart,
  type CanvaService,
  type CanvaTokens,
} from './types';

/** Canva's addresses. */
const authorizeAddress = 'https://www.canva.com/api/oauth/authorize';
const apiAddress = 'https://api.canva.com/rest/v1';

/** What the design and export need: create and read designs, nothing else. */
const scopes = 'design:meta:read design:content:read design:content:write';

/** How often and how long we wait for an export. */
const exportPollMilliseconds = 1000;
const exportPollTries = 30;

/** Our app's credentials from Canva's developer portal. */
export interface CanvaCredentials {
  clientId: string;
  clientSecret: string;
  /**
   * Our brand templates' IDs in Canva, per template (CANVA_TEMPLATE_CLASSIC, …_BOLD,
   * …_HANDWRITTEN); a template without one opens blank (IDEAS-2e).
   */
  templateIds?: Partial<Record<Exclude<CanvaTemplateKey, 'blank'>, string>>;
}

/**
 * Asks Canva's token address (code or refresh), with our credentials.
 *
 * @param form - the grant's fields
 * @returns the tokens, or null when refused
 */
async function requestTokens(
  credentials: CanvaCredentials,
  form: Record<string, string>,
): Promise<CanvaTokens | null> {
  const response = await fetch(`${apiAddress}/oauth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${credentials.clientId}:${credentials.clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form),
  }).catch(() => null);
  if (response === null || !response.ok) return null;
  const answer = (await response.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  } | null;
  if (typeof answer?.access_token !== 'string' || typeof answer.refresh_token !== 'string') {
    return null;
  }
  return {
    accessToken: answer.access_token,
    refreshToken: answer.refresh_token,
    expiresAt: new Date(Date.now() + (answer.expires_in ?? 3600) * 1000),
  };
}

/**
 * One call to the API as the writer.
 *
 * @returns the JSON answer, or null when refused or unreachable
 */
async function callApi(
  accessToken: string,
  path: string,
  body?: unknown,
): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${apiAddress}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
  if (response === null || !response.ok) return null;
  return (await response.json().catch(() => null)) as Record<string, unknown> | null;
}

/**
 * Waits for an export job and gives back its first file's address.
 *
 * @returns the address, or null when it failed or took too long
 */
async function waitForExport(accessToken: string, jobId: string): Promise<string | null> {
  for (let attempt = 0; attempt < exportPollTries; attempt += 1) {
    const answer = await callApi(accessToken, `/exports/${encodeURIComponent(jobId)}`);
    const job = answer?.job as { status?: string; urls?: string[] } | undefined;
    if (job?.status === 'success') return job.urls?.[0] ?? null;
    if (job === undefined || job.status === 'failed') return null;
    await new Promise((resolve) => setTimeout(resolve, exportPollMilliseconds));
  }
  return null;
}

/**
 * Exports a design as a PNG at the cover's size.
 *
 * @returns the file's bytes, or null
 */
async function exportDesign(
  accessToken: string,
  designId: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const started = await callApi(accessToken, '/exports', {
    design_id: designId,
    format: { type: 'png', width: COVER_WIDTH, height: COVER_HEIGHT },
  });
  const jobId = (started?.job as { id?: string } | undefined)?.id;
  if (jobId === undefined) return null;
  const fileAddress = await waitForExport(accessToken, jobId);
  if (fileAddress === null) return null;
  // Our server fetches the file, so the writer's browser never talks to Canva's file host.
  const file = await fetch(fileAddress).catch(() => null);
  if (file === null || !file.ok) return null;
  return new Uint8Array(await file.arrayBuffer());
}

/**
 * Creates a blank cover-sized design.
 *
 * @returns its ID and edit address, or null
 */
async function createBlankDesign(accessToken: string, title: string) {
  const answer = await callApi(accessToken, '/designs', {
    design_type: { type: 'custom', width: COVER_WIDTH, height: COVER_HEIGHT },
    title,
  });
  const design = answer?.design as { id?: string; urls?: { edit_url?: string } } | undefined;
  if (design?.id === undefined || design.urls?.edit_url === undefined) return null;
  return { designId: design.id, editUrl: design.urls.edit_url };
}

/** An autofill job as Canva describes it. */
interface AutofillJob {
  status?: string;
  result?: { design?: { id?: string; urls?: { edit_url?: string } } };
}

/**
 * The design a finished autofill job made.
 *
 * @returns its ID and edit address, or null when the job gives none
 */
function designOfAutofill(job: AutofillJob): CanvaDesign | null {
  const design = job.result?.design;
  const editUrl = design?.urls?.edit_url;
  if (design?.id === undefined || editUrl === undefined) return null;
  return { designId: design.id, editUrl };
}

/**
 * Waits for an autofill job and gives back the design it made.
 *
 * @returns its ID and edit address, or null when it failed or took too long
 */
async function waitForAutofill(accessToken: string, jobId: string): Promise<CanvaDesign | null> {
  for (let attempt = 0; attempt < exportPollTries; attempt += 1) {
    const answer = await callApi(accessToken, `/autofills/${encodeURIComponent(jobId)}`);
    const job = answer?.job as AutofillJob | undefined;
    // Done: the design, or nothing when the job failed or gave none.
    if (job === undefined || job.status === 'failed') return null;
    if (job.status === 'success') return designOfAutofill(job);
    await new Promise((resolve) => setTimeout(resolve, exportPollMilliseconds));
  }
  return null;
}

/**
 * Fills one of our brand templates with the title and pen name (IDEAS-2e). Canva's autofill
 * fills the template's text fields named "title" and "pen_name" (the designer names them so in
 * Canva); a template without one of them simply keeps its own text there.
 *
 * @returns its ID and edit address, or null
 */
async function createTemplateDesign(
  accessToken: string,
  brandTemplateId: string,
  start: CanvaDesignStart,
): Promise<CanvaDesign | null> {
  const started = await callApi(accessToken, '/autofills', {
    brand_template_id: brandTemplateId,
    title: start.title,
    data: {
      title: { type: 'text', text: start.title },
      pen_name: { type: 'text', text: start.penName },
    },
  });
  const jobId = (started?.job as { id?: string } | undefined)?.id;
  if (jobId === undefined) return null;
  return waitForAutofill(accessToken, jobId);
}

/**
 * Creates the design the writer chose: from a template when its brand template ID is set and
 * Canva fills it, otherwise a blank design, so the writer can always start designing.
 *
 * @returns its ID and edit address, or null
 */
async function createDesign(
  credentials: CanvaCredentials,
  accessToken: string,
  start: CanvaDesignStart,
): Promise<CanvaDesign | null> {
  // Step 1: a template, when we have its ID in Canva (CANVA_TEMPLATE_* settings).
  const brandTemplateId =
    start.template === 'blank' ? undefined : credentials.templateIds?.[start.template];
  if (brandTemplateId !== undefined && brandTemplateId !== '') {
    const filled = await createTemplateDesign(accessToken, brandTemplateId, start);
    if (filled !== null) return filled;
  }
  // Step 2: otherwise, or when Canva couldn't fill it, the blank cover as before.
  return createBlankDesign(accessToken, start.title);
}

/**
 * Checks Canva's return token against Canva's published keys.
 *
 * @returns what came back, or null
 */
async function verifyReturn(credentials: CanvaCredentials, correlationJwt: string) {
  const response = await fetch(`${apiAddress}/connect/keys`).catch(() => null);
  if (response === null || !response.ok) return null;
  const answer = (await response.json().catch(() => null)) as { keys?: PublicJwk[] } | null;
  return verifyCanvaJwt(correlationJwt, answer?.keys ?? [], {
    now: new Date(),
    audience: credentials.clientId,
  });
}

/**
 * The real Canva.
 *
 * @param credentials - our client ID and secret
 * @returns the service
 */
export function realCanva(credentials: CanvaCredentials): CanvaService {
  return {
    authorizeUrl: ({ redirectUri, codeChallenge, state }) => {
      const query = new URLSearchParams({
        response_type: 'code',
        client_id: credentials.clientId,
        redirect_uri: redirectUri,
        scope: scopes,
        code_challenge: codeChallenge,
        code_challenge_method: 's256',
        state,
      });
      return `${authorizeAddress}?${query.toString()}`;
    },
    exchangeCode: ({ code, codeVerifier, redirectUri }) =>
      requestTokens(credentials, {
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    refresh: (refreshToken) =>
      requestTokens(credentials, { grant_type: 'refresh_token', refresh_token: refreshToken }),
    createDesign: (accessToken, start) => createDesign(credentials, accessToken, start),
    verifyReturn: (correlationJwt) => verifyReturn(credentials, correlationJwt),
    exportPng: exportDesign,
    revoke: async (refreshToken) => {
      await fetch(`${apiAddress}/oauth/revoke`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${credentials.clientId}:${credentials.clientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ token: refreshToken }),
      }).catch(() => null);
    },
  };
}
