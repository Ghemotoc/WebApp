/**
 * LocalisedWebsiteLayout: the frame of every website page with a country and language in its
 * address, "/<country>/<language>/…" (bundle LOCALISE-1; Robert, 11 Nov 2026).
 *
 * What it does, in order:
 * 1. Checks the place is real: a market, in one of its languages. Anything else ("/fr/en",
 *    "/se/ro", or an unknown address that only looks like a place) shows the "page not found" page.
 * 2. Keeps the address and the interface in the same language. A signed-out visitor who has not
 *    chosen a language in this browser gets the interface in the address's language for this
 *    visit when that language is open (nothing is saved: a link is not a choice). That happens
 *    once, on arrival: picking a language from the menu afterwards moves the address instead. Anyone who has chosen a language, or is
 *    signed in (the account's language), keeps it: the address moves to their language when the
 *    market offers it, so the language menu changes the address too. When the market doesn't
 *    offer their language the page stays as addressed.
 * 3. Shows the page (the router's child route).
 * Who shows it: the router, around the home page, the help centre, help pages and landing pages.
 * What it calls: useWebsiteMarkets, useSession, src/lib/websitePlace.ts and
 * src/lib/language-preference.ts.
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router';

import { NotFoundPage } from '@/app/shell/NotFoundPage';
import { useSession } from '@/features/auth/hooks/useSession';
import { useOpenInterfaceLanguagesState } from '@/features/language/hooks/useOpenInterfaceLanguages';
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

/** What the visitor's own state says about taking a language from an address. */
interface VisitorLanguageState {
  /** The interface language now. */
  interfaceLanguage: string;
  /** True for a signed-out visitor who has not chosen a language in this browser. */
  hasNoChoice: boolean;
  /** The languages the language menu offers. */
  openLanguages: readonly string[];
}

/** The two notes the layout keeps between renders (see useSameLanguage). */
interface ArrivalNotes {
  /** The place this visitor last arrived at. */
  arrivedAt: string | null;
  /** The place whose language the interface is switching to right now. */
  adoptingAt: string | null;
}

/**
 * Decides what to do when the address and the interface may differ in language.
 *
 * @param place - the place in the address
 * @param visitor - the visitor's language state
 * @param notes - the arrival notes; this function updates them
 * @returns 'adopt' (the interface takes the address's language), 'move' (the address follows the
 *   interface) or 'stay'
 */
function languageStepAt(
  place: WebsitePlace,
  visitor: VisitorLanguageState,
  notes: ArrivalNotes,
): 'adopt' | 'move' | 'stay' {
  // Step 1: note the arrival at this place, before anything else can return.
  const placeKey = `${place.country}/${place.language}`;
  const isArrival = notes.arrivedAt !== placeKey;
  notes.arrivedAt = placeKey;
  if (place.language === visitor.interfaceLanguage) {
    notes.adoptingAt = null;
    return 'stay';
  }
  // Step 2: a signed-out visitor with no language chosen, arriving: the interface takes the
  // address's language, when the language menu offers it (a closed language has no interface
  // text to show yet). This happens on arrival only: the menu saves a choice a moment after it
  // switches the screen, and must not be switched back in between.
  if (isArrival && visitor.hasNoChoice && visitor.openLanguages.includes(place.language)) {
    notes.adoptingAt = placeKey;
    return 'adopt';
  }
  // Step 3: while that switch is under way the address stays; otherwise it follows the interface.
  return notes.adoptingAt === placeKey ? 'stay' : 'move';
}

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
  const { languages: openLanguages, isKnown: areLanguagesKnown } = useOpenInterfaceLanguagesState();
  // Kept between renders: the interface takes an address's language once, on arrival, never
  // again when the visitor then picks another language from the menu.
  const notes = useRef<ArrivalNotes>({ arrivedAt: null, adoptingAt: null });
  const interfaceLanguage = i18n.resolvedLanguage ?? '';
  const country = place?.country ?? null;
  const language = place?.language ?? null;
  const isReady = isSessionKnown && areLanguagesKnown;
  useEffect(() => {
    if (country === null || language === null || !isReady) return;
    const hasNoChoice = userId === null && !hasDeviceLanguage();
    const step = languageStepAt(
      { country, language },
      { interfaceLanguage, hasNoChoice, openLanguages },
      notes.current,
    );
    if (step === 'stay') return;
    if (step === 'adopt') {
      void i18n.changeLanguage(language);
      return;
    }
    // The address follows the interface language when the market offers it.
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
    isReady,
    userId,
    openLanguages,
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
