/**
 * The Canva stand-in (story S1-E3-12; ADR 0009; docs/mocks.md: CANVA unset or "stub").
 *
 * It plays Canva's part without leaving our server, so the whole road (connect, design, Return,
 * the export, the picture check and the saved cover) runs locally, in the tests and on staging
 * before there is a Canva developer app:
 * - "Canva's" consent page is our own small page at /api/canva/stub/authorize, with Allow and
 *   Cancel; Allow sends the tab back with the code "stand-in-code";
 * - the "editor" at /api/canva/stub/editor has one Return button, which sends the tab back with a
 *   return token signed by the stand-in's fixed key (jwt.ts);
 * - the export is a drawn 1600 × 2560 PNG (png.ts).
 * The pages are plain HTML from our own address, with no scripts.
 * Who calls it: server/canva/index.ts (the service) and server/canva.ts (the two pages).
 */
import { signStandInJwt, verifyStandInJwt } from './jwt';
import { standInDesignPng } from './png';
import { COVER_HEIGHT, COVER_WIDTH, type CanvaService, type CanvaTokens } from './types';

/** The one code the stand-in's consent page hands out. */
export const STAND_IN_CODE = 'stand-in-code';

/** A random hex text, so two stand-in designs or tokens never look the same. */
function randomHex(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

/** Fresh stand-in tokens, good for four hours like Canva's. */
function standInTokens(): CanvaTokens {
  return {
    accessToken: `stand-in-access-${randomHex()}`,
    refreshToken: `stand-in-refresh-${randomHex()}`,
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
  };
}

/**
 * The stand-in Canva.
 *
 * @param origin - our own address (for example http://localhost:5173), where its pages live
 * @returns the service
 */
export function standInCanva(origin: string): CanvaService {
  return {
    authorizeUrl: ({ state }) =>
      `${origin}/api/canva/stub/authorize?${new URLSearchParams({ state }).toString()}`,
    exchangeCode: ({ code }) => Promise.resolve(code === STAND_IN_CODE ? standInTokens() : null),
    refresh: (refreshToken) =>
      Promise.resolve(refreshToken.startsWith('stand-in-refresh-') ? standInTokens() : null),
    createDesign: (accessToken) => {
      if (!accessToken.startsWith('stand-in-access-')) return Promise.resolve(null);
      const designId = `stand-in-${randomHex()}`;
      const query = new URLSearchParams({ design: designId });
      return Promise.resolve({
        designId,
        editUrl: `${origin}/api/canva/stub/editor?${query.toString()}`,
      });
    },
    verifyReturn: (correlationJwt) => verifyStandInJwt(correlationJwt, new Date()),
    exportPng: (accessToken) =>
      accessToken.startsWith('stand-in-access-')
        ? standInDesignPng(COVER_WIDTH, COVER_HEIGHT)
        : Promise.resolve(null),
    revoke: () => Promise.resolve(),
  };
}

/** Text made safe to put inside HTML. */
function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * A small page with a heading, a line and links that look like buttons.
 *
 * @param links - each button's label and address
 * @returns the HTML response
 */
function standInPage(heading: string, line: string, links: { label: string; href: string }[]) {
  const buttons = links
    .map(
      (link) =>
        `<a href="${escapeHtml(link.href)}" style="display:inline-flex;align-items:center;min-height:44px;padding:0 18px;margin-right:12px;border-radius:999px;border:1px solid #481C5F;color:#481C5F;font-weight:600;text-decoration:none">${escapeHtml(link.label)}</a>`,
    )
    .join('');
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head><body style="font-family:system-ui,sans-serif;margin:0;padding:32px 16px;color:#26142E;background:#FBF8F4"><main style="max-width:560px;margin:0 auto"><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(line)}</p><p>${buttons}</p></main></body></html>`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/**
 * The stand-in consent page: Allow and Cancel, both back to our return page.
 *
 * @param request - GET /api/canva/stub/authorize?state=…
 * @param origin - our own address; the way back is always ours, never taken from the address
 * @returns the page
 */
export function standInConsentPage(request: Request, origin: string): Response {
  const state = new URL(request.url).searchParams.get('state') ?? '';
  const back = (query: Record<string, string>) =>
    `${origin}/canva/return?${new URLSearchParams({ ...query, state }).toString()}`;
  return standInPage(
    'Canva stand-in: connect your account',
    'This page stands in for Canva while there is no Canva developer app. Nothing leaves our server.',
    [
      { label: 'Allow', href: back({ code: STAND_IN_CODE }) },
      { label: 'Cancel', href: back({ error: 'access_denied' }) },
    ],
  );
}

/**
 * The stand-in editor: one Return button with a signed return token.
 *
 * @param request - GET /api/canva/stub/editor?design=…&correlation_state=…
 * @param origin - our own address
 * @returns the page
 */
export async function standInEditorPage(request: Request, origin: string): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const correlationJwt = await signStandInJwt(
    {
      designId: query.get('design') ?? '',
      correlationState: query.get('correlation_state') ?? '',
    },
    new Date(),
  );
  return standInPage(
    'Canva stand-in: your design',
    'Pretend you designed your cover here, then press Return.',
    [
      {
        label: 'Return',
        href: `${origin}/canva/return?${new URLSearchParams({ correlation_jwt: correlationJwt }).toString()}`,
      },
    ],
  );
}
