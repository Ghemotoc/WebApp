/**
 * Picks the Canva service: the real Canva Connect API when CANVA is "real" and our app's
 * credentials are set, the stand-in otherwise (story S1-E3-12; ADR 0009; docs/mocks.md).
 * Who calls it: functions/api/canva/[[path]].ts and server/pages-functions-plugin.ts.
 */
import { realCanva, type CanvaCredentials } from './real';
import { standInCanva } from './stub';
import type { CanvaService } from './types';

/** Which Canva to use, as Cloudflare's settings say. */
export interface CanvaSettings extends Partial<CanvaCredentials> {
  /** "real" for Canva; anything else is the stand-in. */
  mode: string | undefined;
}

/**
 * Whether these settings use the stand-in.
 *
 * @returns true unless CANVA is "real"
 */
export function usesStandIn(settings: CanvaSettings): boolean {
  return settings.mode !== 'real';
}

/**
 * Makes the service for one request.
 *
 * @param settings - CANVA, CANVA_CLIENT_ID, CANVA_CLIENT_SECRET and the template IDs (IDEAS-2e)
 * @param origin - our own address, for the stand-in's pages
 * @returns the service, or null in real mode without credentials (the server answers
 *   "unavailable")
 */
export function canvaService(settings: CanvaSettings, origin: string): CanvaService | null {
  if (usesStandIn(settings)) return standInCanva(origin);
  if (!settings.clientId || !settings.clientSecret) return null;
  return realCanva({
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    templateIds: settings.templateIds,
  });
}
