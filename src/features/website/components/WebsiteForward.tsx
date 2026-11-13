/**
 * WebsiteForward: sends an older website address ("/", "/help", "/help/<name>", "/c/<name>") on
 * to the same page at the visitor's country and language, such as "/se/sv/help" (bundle
 * LOCALISE-1; Robert, 11 Nov 2026: "Country and language always").
 *
 * The country is the account's, or the connection's when signed out (useVisitorCountry); the
 * language is the one the interface shows. A country with no market goes to Romania's pages
 * (decided 17 Oct 2026, 19:16). The query and the place on the page ("#questions") are kept, and
 * the older address is replaced in the history, so Back doesn't bounce.
 * A visitor who has already clicked a link to somewhere else is left alone: the forward never
 * pulls them back from the page they asked for (found by the epic S1-E14 journey, which clicked
 * "Terms" in the footer while the country was still being read and landed on the home page).
 * The router itself is asked, at the moment of forwarding, where the visitor is and where they
 * are going. React can still be showing this component for a moment after the router has opened
 * the page the visitor clicked, and in that moment the forward used to fire from the old address
 * and take them to the home page (seen about once in fifteen signed-in runs of the same journey,
 * 13 Nov 2026).
 * Who shows it: the router, at each older website address. What it calls: useVisitorCountry,
 * useWebsiteMarkets and src/lib/websitePlace.ts.
 */
import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UNSAFE_DataRouterContext as DataRouterContext,
  useLocation,
  useNavigate,
  useNavigation,
} from 'react-router';

import { useVisitorCountry } from '@/features/safety/hooks/useVisitorCountry';
import { pathAtPlace, placeForVisitor } from '@/lib/websitePlace';

import { useWebsiteMarkets } from '../hooks/useWebsiteMarkets';

/**
 * Says whether the visitor has left, or is leaving, the address this component was drawn for.
 * It reads the router itself, so the answer is never a render behind.
 *
 * @returns a function that is true when the router is already at another page, or on its way
 *   to one
 */
function useIsLeavingNow(): () => boolean {
  const dataRouter = useContext(DataRouterContext);
  const location = useLocation();
  return () => {
    const routerState = dataRouter?.router.state;
    if (routerState === undefined) return false;
    // Step 1: the router has already opened another page; React is about to draw it.
    if (routerState.location.pathname !== location.pathname) return true;
    // Step 2: another page is on its way (its code may still be loading).
    const pending = routerState.navigation.location;
    return pending !== undefined && pending.pathname !== location.pathname;
  };
}

/**
 * Renders nothing. Once the country and the markets are known it forwards, unless the visitor
 * is already leaving for another page.
 *
 * @returns null: this component only moves the address
 */
export function WebsiteForward() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { countryCode, isKnown: isCountryKnown } = useVisitorCountry();
  const { markets, isKnown: areMarketsKnown } = useWebsiteMarkets();
  const isLeavingNow = useIsLeavingNow();
  // Read so this component checks again when a navigation starts or ends.
  const navigationState = useNavigation().state;
  const isReady = isCountryKnown && areMarketsKnown;
  // With no markets list (the read failed) this is the fallback place, which still opens.
  const place = placeForVisitor(markets, countryCode, i18n.resolvedLanguage ?? null);
  const target = `${pathAtPlace(place, location.pathname)}${location.search}${location.hash}`;
  useEffect(() => {
    // Step 1: wait for the country and the markets.
    if (!isReady) return;
    // Step 2: a visitor who clicked a link while this was waiting keeps the page they asked for.
    if (isLeavingNow()) return;
    // Step 3: forward, replacing the older address so Back doesn't bounce.
    void navigate(target, { replace: true });
    // isLeavingNow is read fresh on each run; listing it would run this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, target, navigate, navigationState]);
  return null;
}
