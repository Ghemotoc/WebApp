/**
 * Picks the age check service: Yoti's Age Verification API when YOTI is "real" and our
 * credentials are set, the stand-in otherwise (story S1-E2-08, part 08a; ADR 0010;
 * docs/mocks.md).
 * Who calls it: functions/api/age-check/[[path]].ts and server/pages-functions-plugin.ts.
 */
import { standInYoti } from './stub';
import type { AgeCheckService } from './types';
import { realYoti, type YotiCredentials } from './yoti';

/** Which service to use, as Cloudflare's settings say. */
export interface AgeCheckSettings extends Partial<YotiCredentials> {
  /** "real" for Yoti; anything else is the stand-in. */
  mode: string | undefined;
}

/**
 * Whether these settings use the stand-in.
 *
 * @returns true unless YOTI is "real"
 */
export function usesStandIn(settings: AgeCheckSettings): boolean {
  return settings.mode !== 'real';
}

/**
 * Makes the service for one request.
 *
 * @param settings - YOTI, YOTI_API_KEY, YOTI_SDK_ID and YOTI_NOTIFICATION_PUBLIC_KEY
 * @param origin - our own address, for the stand-in's page
 * @returns the service, or null in real mode without every credential (the server answers
 *   "unavailable")
 */
export function ageCheckService(
  settings: AgeCheckSettings,
  origin: string,
): AgeCheckService | null {
  if (usesStandIn(settings)) return standInYoti(origin);
  if (!settings.apiKey || !settings.sdkId || !settings.notificationPublicKey) return null;
  return realYoti({
    apiKey: settings.apiKey,
    sdkId: settings.sdkId,
    notificationPublicKey: settings.notificationPublicKey,
  });
}
