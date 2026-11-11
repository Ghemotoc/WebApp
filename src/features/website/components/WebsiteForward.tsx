/**
 * WebsiteForward: sends an older website address ("/", "/help", "/help/<name>", "/c/<name>") on
 * to the same page at the visitor's country and language, such as "/se/sv/help" (bundle
 * LOCALISE-1; Robert, 11 Nov 2026: "Country and language always").
 *
 * The country is the account's, or the connection's when signed out (useVisitorCountry); the
 * language is the one the interface shows. A country with no market goes to Romania's pages
 * (decided 17 Oct 2026, 19:16). The query and the place on the page ("#questions") are kept, and
 * the older address is replaced in the history, so Back doesn't bounce.
 * Who shows it: the router, at each older website address. What it calls: useVisitorCountry,
 * useWebsiteMarkets and src/lib/websitePlace.ts.
 */
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';

import { useVisitorCountry } from '@/features/safety/hooks/useVisitorCountry';
import { pathAtPlace, placeForVisitor } from '@/lib/websitePlace';

import { useWebsiteMarkets } from '../hooks/useWebsiteMarkets';

/**
 * Renders nothing until the country and the markets are known, then forwards.
 *
 * @returns the redirect, or null while waiting
 */
export function WebsiteForward() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { countryCode, isKnown: isCountryKnown } = useVisitorCountry();
  const { markets, isKnown: areMarketsKnown } = useWebsiteMarkets();
  if (!isCountryKnown || !areMarketsKnown) return null;
  // With no markets list (the read failed) this is the fallback place, which still opens.
  const place = placeForVisitor(markets, countryCode, i18n.resolvedLanguage ?? null);
  const target = `${pathAtPlace(place, location.pathname)}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}
