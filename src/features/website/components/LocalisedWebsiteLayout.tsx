/**
 * LocalisedWebsiteLayout: the frame of every website page with a country and language in its
 * address, "/<country>/<language>/…" (bundle LOCALISE-1; Robert, 11 Nov 2026).
 *
 * What it does, in order:
 * 1. Checks the place is real: a market, in one of its languages. Anything else ("/fr/en",
 *    "/se/ro", or an unknown address that only looks like a place) shows the "page not found" page.
 * 2. Keeps the address and the interface in the same language. A signed-out visitor who has not
 *    chosen a language in this browser gets the interface in the address's language for this
 *    visit (nothing is saved: a link is not a choice). Anyone who has chosen a language, or is
 *    signed in (the account's language), keeps it: the address moves to their language when the
 *    market offers it, so the language menu changes the address too. When the market doesn't
 *    offer their language the page stays as addressed.
 * 3. Shows the page (the router's child route).
 * Who shows it: the router, around the home page, the help centre, help pages and landing pages.
 * What it calls: useWebsiteMarkets, useSession, src/lib/websitePlace.ts and
 * src/lib/language-preference.ts.
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { NotFoundPage } from '@/app/shell/NotFoundPage';
import { useSession } from '@/features/auth/hooks/useSession';
import { isSupportedLanguage } from '@/lib/i18n';
import { hasDeviceLanguage } from '@/lib/language-preference';
import {
  isKnownPlace,
  pathAtPlace,
  pathWithoutPlace,
  placeInInterfaceLanguage,
  placeOfPath,
  type WebsiteMarket,
  type WebsitePlace,
} from '@/lib/websitePlace';

import { useWebsiteMarkets } from '../hooks/useWebsiteMarkets';

/**
 * Keeps the address and the interface in the same language (step 2 of the file header).
 *
 * @param markets - the markets list
 * @param place - the place in the address, or null when the address has none or it isn't real
 */
function useSameLanguage(markets: WebsiteMarket[], place: WebsitePlace | null): void {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, isKnown: isSessionKnown } = useSession();
  const interfaceLanguage = i18n.resolvedLanguage ?? '';
  const country = place?.country ?? null;
  const language = place?.language ?? null;
  useEffect(() => {
    if (country === null || language === null || language === interfaceLanguage) return;
    if (!isSessionKnown) return;
    // A signed-out visitor with no language chosen: the interface takes the address's language.
    if (userId === null && !hasDeviceLanguage() && isSupportedLanguage(language)) {
      void i18n.changeLanguage(language);
      return;
    }
    // Anyone else keeps their language; the address follows it when the market offers it.
    const moved = placeInInterfaceLanguage(markets, { country, language }, interfaceLanguage);
    if (moved === null) return;
    const page = pathWithoutPlace(location.pathname);
    void navigate(`${pathAtPlace(moved, page)}${location.search}${location.hash}`, {
      replace: true,
    });
  }, [
    country,
    language,
    interfaceLanguage,
    isSessionKnown,
    userId,
    markets,
    i18n,
    navigate,
    location,
  ]);
}

/**
 * Renders the page for a real place, or "page not found".
 *
 * @returns the child route, the not-found page, or nothing while the markets are read
 */
export function LocalisedWebsiteLayout() {
  const { pathname } = useLocation();
  const { markets, isKnown, readFailed } = useWebsiteMarkets();
  const place = placeOfPath(pathname);
  // When the markets can't be read, a place that is shaped like one opens anyway: the page then
  // shows its last saved copy rather than "not found".
  const isReal = place !== null && (readFailed || isKnownPlace(markets, place));
  useSameLanguage(markets, isKnown && isReal ? place : null);
  if (!isKnown) return null;
  return isReal ? <Outlet /> : <NotFoundPage />;
}
