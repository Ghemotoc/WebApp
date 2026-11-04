/**
 * Loading the ad network's script, once, and asking it for one ad (bundle SPONSORS, part d; story
 * S1-E12-04; ADR 0014).
 *
 * The network is Google AdSense. Its script is added to the page only when a network ad's slot
 * comes into view (criterion 2), never on page load, and every request asks for non-personalised
 * ads (`requestNonPersonalizedAds = 1`). Limited-ads mode, which also stops cookies and device
 * storage, is switched on for the account in AdSense itself before the flag is turned on (a
 * GO-LIVE step in ADR 0014); if Google can't promise that, the flag stays off and every slot
 * shows our own ads.
 * Who calls it: components/NetworkAdCreative.tsx.
 */

/** The one address the script is loaded from (reviewed in scripts/check-third-party.ts). */
export const adNetworkScriptAddress =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

/** The queue the network's script reads requests from. */
interface AdNetworkQueue extends Array<Record<string, never>> {
  requestNonPersonalizedAds?: number;
}

/** The window, with the network's queue on it. */
type WindowWithAdNetwork = Window & { adsbygoogle?: AdNetworkQueue };

/** The script's loading, shared by every slot on the page. */
let scriptLoading: Promise<void> | null = null;

/**
 * Adds the script to the page the first time, and waits for it.
 *
 * @param publisherId - the AdSense publisher ID ("ca-pub-" and 16 digits, checked by the server)
 * @returns a promise that settles when the script has loaded
 * @throws Error when the script can't load (blocked by the browser or an extension, or offline)
 */
export function loadAdNetworkScript(publisherId: string): Promise<void> {
  if (scriptLoading !== null) return scriptLoading;
  scriptLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `${adNetworkScriptAddress}?client=${encodeURIComponent(publisherId)}`;
    script.onload = () => resolve();
    script.onerror = () => {
      // Forget the failed attempt, so a later slot can try again.
      scriptLoading = null;
      reject(new Error('The ad network’s script did not load.'));
    };
    document.head.appendChild(script);
  });
  return scriptLoading;
}

/**
 * Asks the network to fill the ad element just placed on the page, never personalised.
 */
export function requestNetworkAd(): void {
  const page = window as WindowWithAdNetwork;
  const queue: AdNetworkQueue = page.adsbygoogle ?? [];
  page.adsbygoogle = queue;
  // Non-personalised for every reader of every age (S1-E12-04 criterion 1).
  queue.requestNonPersonalizedAds = 1;
  queue.push({});
}
