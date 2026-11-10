/**
 * storyQr: what the Marketing page's QR code can point at, and the code as a file to download
 * (bundle G10c3, board AtlasMarketing: "QR code, for posters, flyers and bookmarks").
 *
 * The code is worked out in the browser (features/spaces/lib/qrModules.ts), so nothing is sent
 * anywhere and nothing is stored: a QR code is only the address written as squares. No tracking
 * (CLAUDE.md rule 7): the address is the page's plain address, with nothing added to count scans.
 * Who calls it: components/StoryQrCard.tsx. What it calls: qrModulesFor() and qrPathFor().
 */
import { qrModulesFor, qrPathFor } from '@/features/spaces/lib/qrModules';

/** The white border round the code, in squares (the QR standard asks for 4). */
export const qrQuietZone = 4;

/** The places a code can take people. */
export type QrDestination = 'story' | 'world' | 'profile';

/** One choice: where it goes and the address after the site's own. */
export interface QrChoice {
  destination: QrDestination;
  path: string;
}

/**
 * The choices a writer has for one story.
 *
 * @param slug - the story's slug
 * @param handle - the writer's username, or null before one is chosen
 * @param isWorldShared - whether readers can open the story's world (the Readers page's switch)
 * @returns the story page always; the story's world only while it is shared; the profile only
 *   with a username
 */
export function qrChoices(slug: string, handle: string | null, isWorldShared: boolean): QrChoice[] {
  const choices: QrChoice[] = [{ destination: 'story', path: `/s/${slug}` }];
  if (isWorldShared) choices.push({ destination: 'world', path: `/s/${slug}/atlas/world` });
  if (handle !== null) {
    choices.push({ destination: 'profile', path: `/u/${encodeURIComponent(handle)}` });
  }
  return choices;
}

/**
 * The code as an SVG file's text: black squares on white, whatever the theme, because scanners
 * need dark on light.
 *
 * @param address - the full address the code holds
 * @returns the SVG document
 * Errors: throws when the address is empty (qrModulesFor).
 */
export function qrSvgFile(address: string): string {
  const modules = qrModulesFor(address);
  const size = modules.length + qrQuietZone * 2;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="1024" height="1024" shape-rendering="crispEdges">`,
    `<rect width="${size}" height="${size}" fill="#fff"/>`,
    `<path d="${qrPathFor(modules, qrQuietZone)}" fill="#000"/>`,
    '</svg>',
  ].join('');
}

/** The file name a download is saved under: "<story>-qr-<where>.<kind>". */
export function qrFileName(slug: string, destination: QrDestination, kind: 'png' | 'svg'): string {
  return `${slug}-qr-${destination}.${kind}`;
}
