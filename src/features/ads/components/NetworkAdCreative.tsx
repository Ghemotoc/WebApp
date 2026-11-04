/**
 * NetworkAdCreative: an ad from the ad network inside a wide banner slot (bundle SPONSORS, part
 * d; story S1-E12-04; ADR 0014).
 *
 * Nothing from the network loads until the slot comes into view (criterion 2). Then the
 * network's script is added once for the page and asked for one non-personalised ad, which it
 * draws in the element below. If the script can't load (an ad blocker, offline), the slot shows
 * our own "Start writing" ad instead, so it is never blank. The "Ad" pill is drawn by AdBox.
 * Who shows it: AdBox, for an ad whose kind is 'network'.
 * What it calls: lib/adNetwork.ts and, on failure, HouseAdCreative.
 */
import { useEffect, useRef, useState } from 'react';

import type { SlotAd } from '@/schemas/ads';

import { loadAdNetworkScript, requestNetworkAd } from '../lib/adNetwork';

import { HouseAdCreative } from './HouseAdCreative';

/** Where the slot is: waiting to be seen, asking the network, or showing our own ad instead. */
type NetworkSlotState = 'waiting' | 'asked' | 'failed';

/** Our own ad shown when the network can't load. */
const fallbackAd: SlotAd = {
  key: 'house:write',
  label: 'house',
  kind: 'write',
  page_slug: null,
  title_ro: null,
  title_en: null,
};

/**
 * Watches the element and calls back once, the first time it comes into view.
 *
 * @param onSeen - what to do then
 * @returns the ref to put on the element
 */
function useFirstView(onSeen: () => void) {
  const elementRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = elementRef.current;
    if (element === null) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      onSeen();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onSeen]);
  return elementRef;
}

/**
 * Renders the network's ad, or our own when it can't load.
 *
 * @param props.ad - the network ad from page_ads(), with the account and the ad unit
 * @param props.isStacked - true in a narrow slot (the network only fills wide ones)
 * @returns the creative
 */
export function NetworkAdCreative({ ad, isStacked }: { ad: SlotAd; isStacked: boolean }) {
  const [state, setState] = useState<NetworkSlotState>('waiting');
  // Step 1: once the slot is seen, load the script and ask for the ad.
  const [onSeen] = useState(() => () => {
    setState('asked');
    loadAdNetworkScript(ad.publisher_id ?? '')
      .then(requestNetworkAd)
      .catch((error: unknown) => {
        console.warn('The ad network could not load; showing our own ad.', error);
        setState('failed');
      });
  });
  const elementRef = useFirstView(onSeen);
  // Step 2: our own ad when the network failed.
  if (state === 'failed') return <HouseAdCreative ad={fallbackAd} isStacked={isStacked} />;
  return (
    <div ref={elementRef} className="min-h-[90px] w-full min-w-0 flex-[1_1_200px]">
      {state === 'asked' && (
        <ins
          className="adsbygoogle block"
          data-ad-client={ad.publisher_id ?? ''}
          data-ad-slot={ad.slot_id ?? ''}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
}
