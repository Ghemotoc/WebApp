/**
 * The pages a phone can still open while the trial runs on computers only (TRIAL-DESKTOP).
 *
 * Who calls it: components/DesktopOnlyGate.tsx.
 * Why these: the legal centre, Contact us and the public report form are the contact points the
 * DSA asks to keep reachable (art. 11, 12 and 16), as the maintenance page keeps them open
 * (src/features/maintenance/lib/openDuringMaintenance.ts). The email link's landing page, a new
 * password and unsubscribe stay open too, because those links are often opened on a phone.
 */
import { pathWithoutPlace } from '@/lib/websitePlace';

/** The start of every address that stays open on a phone. */
const openPathPrefixes = [
  '/legal',
  '/contact',
  '/report',
  '/auth/',
  '/reset-password',
  '/unsubscribe',
];

/**
 * Says whether a phone may open this page during the trial.
 *
 * @param pathname - the address's path, with or without its country and language
 * @returns true for the pages above
 */
export function isOpenOnPhones(pathname: string): boolean {
  const pagePath = pathWithoutPlace(pathname);
  return openPathPrefixes.some((prefix) => pagePath.startsWith(prefix));
}
