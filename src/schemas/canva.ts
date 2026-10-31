/**
 * The "Design it in Canva" contract: what our Canva pages send to /api/canva/… and what comes
 * back (story S1-E3-12; ADR 0009). Shared by src/features/canva/ and server/canva.ts, so both
 * check the same rules. Imported with a relative path because Cloudflare's functions build
 * doesn't know the "@/" alias.
 */
import { z } from 'zod';

/** PKCE values and OAuth state: base64url text, 43 to 128 characters (RFC 7636). */
const pkceText = z.string().regex(/^[A-Za-z0-9_-]{43,128}$/);

/** POST /api/canva/design: open a blank cover design for one of the writer's stories. */
export const canvaDesignRequestSchema = z.object({
  /** The story's ID; it comes back with Canva's return token, so the cover finds its story. */
  storyId: z.string().uuid(),
  /** The design's name in the writer's Canva account. */
  storyTitle: z.string().trim().min(1).max(200),
  /** Used only when the writer hasn't connected Canva yet. */
  codeChallenge: pkceText,
  state: pkceText,
});

/** A checked design request. */
export type CanvaDesignRequest = z.infer<typeof canvaDesignRequestSchema>;

/** The answer: go to Canva's consent page first, or straight to the new design. */
export const canvaDesignResponseSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('connect'), authorizeUrl: z.string().url() }),
  z.object({ kind: z.literal('design'), editUrl: z.string().url() }),
]);

/** A checked design answer. */
export type CanvaDesignResponse = z.infer<typeof canvaDesignResponseSchema>;

/** POST /api/canva/connect: the code from Canva's consent page and the PKCE verifier. */
export const canvaConnectRequestSchema = z.object({
  code: z.string().min(1).max(2000),
  codeVerifier: pkceText,
});

/** POST /api/canva/return: the token Canva sent back on Return. */
export const canvaReturnRequestSchema = z.object({
  correlationJwt: z.string().min(1).max(8000),
});

/**
 * Why something didn't work, as the pages explain it:
 * switched_off (canva_covers is off), account (the account may not write), not_connected (no
 * Canva connection, or Canva no longer accepts it), declined (Canva refused the code), expired
 * (the return token is wrong or too old), export_failed (Canva couldn't export the design),
 * unavailable (our server has no Canva settings), unreachable, signed_out and invalid.
 */
export const canvaFailures = [
  'switched_off',
  'account',
  'not_connected',
  'declined',
  'expired',
  'export_failed',
  'unavailable',
  'unreachable',
  'signed_out',
  'invalid',
] as const;

/** One of the reasons above. */
export type CanvaFailure = (typeof canvaFailures)[number];

/** The answer when something didn't work. */
export const canvaFailureSchema = z.object({ error: z.enum(canvaFailures) });

/** The header that carries the story's ID with the exported PNG. */
export const CANVA_STORY_HEADER = 'X-Story-Id';
