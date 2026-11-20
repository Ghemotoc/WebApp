/**
 * StaffBrowserBars: gives a phone browser's own bars the staff area's page colour while the staff
 * frame is on screen, and the member's colour again once it has gone (the simplified design,
 * bundle CALM-1; Robert, 20 Nov 2026, 13:10 UTC: the bars match the page, never black).
 *
 * Why: the staff area paints its own flat beige over the member's page (data-area="staff",
 * src/styles/tokens.css), so the colour the bars need changes when a staff page opens or closes,
 * not only when the theme, the look or high contrast changes.
 * Who uses it: StaffLayout, inside the staff frame, so the frame is already on the page when this
 * runs. What it calls: matchBrowserBarsToPage (src/lib/browserBarColour.ts), which reads --paper
 * from the staff frame while it is there and from <html> once it has gone.
 * It draws nothing.
 */
import { useEffect } from 'react';

import { matchBrowserBarsToPage } from '@/lib/browserBarColour';

/**
 * Matches the bars to the staff area on arrival and to the member's page on leaving.
 *
 * @returns nothing on screen
 */
export function StaffBrowserBars(): null {
  useEffect(() => {
    // Step 1: the staff frame is on the page now, so the bars take its page colour.
    matchBrowserBarsToPage();
    // Step 2: React runs this after the staff frame has left the page, so the bars go back to the
    // member's page colour.
    return () => {
      matchBrowserBarsToPage();
    };
  }, []);
  return null;
}
