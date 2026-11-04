/**
 * What our server needs from Canva, as one interface with two versions: the real Canva Connect
 * API (real.ts) and the stand-in (stub.ts), which never leaves our server (story S1-E3-12;
 * ADR 0009; docs/mocks.md).
 * Who uses it: server/canva.ts picks the version with canvaService() (index.ts).
 */
import type { CanvaReturn } from './jwt';

/** The writer's tokens, in plain text only inside one request. */
export interface CanvaTokens {
  accessToken: string;
  refreshToken: string;
  /** When the access token stops working. */
  expiresAt: Date;
}

/** A new blank design. */
export interface CanvaDesign {
  designId: string;
  /** Where the writer edits it; good for a short while only, so it is used at once. */
  editUrl: string;
}

/** The calls our server makes. Each answers null when Canva refused or couldn't be reached. */
export interface CanvaService {
  /** Canva's sign-in and consent page, with our PKCE challenge and state. */
  authorizeUrl: (request: { redirectUri: string; codeChallenge: string; state: string }) => string;
  /** Swaps the code from the consent page for tokens. */
  exchangeCode: (request: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }) => Promise<CanvaTokens | null>;
  /** New tokens for an expired access token. */
  refresh: (refreshToken: string) => Promise<CanvaTokens | null>;
  /** A blank cover-sized design in the writer's Canva account. */
  createDesign: (accessToken: string, title: string) => Promise<CanvaDesign | null>;
  /** Checks the token Canva sends back on Return. */
  verifyReturn: (correlationJwt: string) => Promise<CanvaReturn | null>;
  /** Exports the design's first page as a PNG. */
  exportPng: (accessToken: string, designId: string) => Promise<Uint8Array<ArrayBuffer> | null>;
  /** Tells Canva to forget the tokens (on disconnect); never fails the disconnect. */
  revoke: (refreshToken: string) => Promise<void>;
}

/** The cover's size in pixels (S1-E3-01: tall 1600 × 2560). */
export const COVER_WIDTH = 1600;
export const COVER_HEIGHT = 2560;
