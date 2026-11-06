/**
 * Small rules about the home page's bands (bundle LOOK-3).
 *
 * Who calls it: WebsiteHomePage.
 */
import type { HomeBand } from '@/schemas/websiteContent';

/**
 * Whether a band has words to show: the page leaves out a band whose heading is empty.
 *
 * @param band - the band, or undefined in a version saved before the bands existed
 * @returns true when the band should be drawn
 */
export function hasBand(band: HomeBand | undefined): band is HomeBand {
  return band !== undefined && band.heading.trim() !== '';
}
