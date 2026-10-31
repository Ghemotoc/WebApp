/**
 * The tab's memory of one trip to Canva (story S1-E3-12; ADR 0009).
 *
 * "Design it in Canva" opens a new tab, and that one tab goes to Canva and comes back, maybe
 * twice (the consent page, then the editor). It remembers which story the cover is for and the
 * PKCE verifier and state in sessionStorage, which belongs to this tab alone and goes when the tab
 * closes. Nothing here is sent to Canva except the challenge and the state.
 * Storage can be switched off or full, so every read and write is guarded; without it the
 * connect step says plainly that it can't continue (the design step doesn't need it).
 * Who calls it: api/canva.ts and hooks/useCanvaReturn.ts.
 */
import { codeChallengeFor, randomPkceText } from './pkce';

/** What the tab remembers. */
export interface CanvaTrip {
  storyId: string;
  storyTitle: string;
  state: string;
  codeVerifier: string;
}

/** The sessionStorage key. */
const tripKey = 'canva-trip';

/**
 * Starts a trip: fresh PKCE values, remembered for this tab.
 *
 * @param story - the story's ID and title
 * @returns the trip and the challenge to send
 */
export async function startCanvaTrip(story: {
  storyId: string;
  storyTitle: string;
}): Promise<{ trip: CanvaTrip; codeChallenge: string }> {
  const trip: CanvaTrip = { ...story, state: randomPkceText(), codeVerifier: randomPkceText() };
  try {
    sessionStorage.setItem(tripKey, JSON.stringify(trip));
  } catch {
    // Without storage the tab can't connect Canva, but a writer already connected can still design.
  }
  return { trip, codeChallenge: await codeChallengeFor(trip.codeVerifier) };
}

/**
 * The trip this tab remembers.
 *
 * @returns the trip, or null when there is none or it can't be read
 */
export function rememberedCanvaTrip(): CanvaTrip | null {
  try {
    const stored = sessionStorage.getItem(tripKey);
    if (stored === null) return null;
    const trip = JSON.parse(stored) as Partial<CanvaTrip>;
    if (
      typeof trip.storyId !== 'string' ||
      typeof trip.storyTitle !== 'string' ||
      typeof trip.state !== 'string' ||
      typeof trip.codeVerifier !== 'string'
    ) {
      return null;
    }
    return trip as CanvaTrip;
  } catch {
    return null;
  }
}
