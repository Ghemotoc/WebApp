/**
 * OpenHerePage: where the links in the "Tell me when you open here" confirm email land (bundle G5,
 * part a; story S1-E2-10). /open-here/confirm#<token> confirms the address; /open-here/remove#<token>
 * takes it off the list (GDPR art. 7(1) and 7(3)).
 *
 * Who shows it: the router, at /open-here/:action, for anyone, signed in or not.
 * What it calls: api/openingList.ts (confirm_opening_list() or leave_opening_list()) once, as the
 * page opens. The token is read from after "#", so it never reaches a server log, and it is
 * cleared from the address bar once used, so a shared screenshot can't carry it.
 */
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';

import { getSupabaseClient } from '@/lib/supabase';

import { confirmOpeningList, leaveOpeningList, type LinkOutcome } from '../api/openingList';

import { AuthCard } from './AuthCard';

/**
 * Reads the token after "#" once and takes it out of the address bar.
 *
 * @returns the token, or "" when there is none
 */
function takeTokenFromAddress(): string {
  const token = window.location.hash.replace(/^#/, '');
  if (token !== '') {
    window.history.replaceState(null, '', window.location.pathname);
  }
  return token;
}

/**
 * Follows the link: confirms or removes, once.
 *
 * @param action - "confirm" or "remove"
 * @param token - the token from the link
 * @returns what happened
 */
async function followLink(action: string, token: string): Promise<LinkOutcome> {
  if (token === '') return { kind: 'not_found' };
  const client = await getSupabaseClient();
  if (client === null) return { kind: 'unavailable' };
  return action === 'remove' ? leaveOpeningList(client, token) : confirmOpeningList(client, token);
}

/**
 * The heading and text for each outcome.
 *
 * @returns the translation keys and values
 */
function wordsFor(outcome: LinkOutcome | undefined, countryName: (code: string) => string) {
  if (outcome === undefined) return { heading: 'openHere.working', body: null, values: {} };
  if (outcome.kind === 'confirmed') {
    return {
      heading: 'openHere.confirmedHeading',
      body: 'openHere.confirmedBody',
      values: { country: countryName(outcome.countryCode) },
    };
  }
  if (outcome.kind === 'removed') {
    return { heading: 'openHere.removedHeading', body: 'openHere.removedBody', values: {} };
  }
  if (outcome.kind === 'not_found') {
    return { heading: 'openHere.notFoundHeading', body: 'openHere.notFoundBody', values: {} };
  }
  return { heading: 'openHere.unavailableHeading', body: 'openHere.unavailableBody', values: {} };
}

/**
 * Renders the page.
 *
 * @returns the confirmation, removal or "doesn't work" screen
 */
export function OpenHerePage() {
  const { t, i18n } = useTranslation('auth');
  const { action = 'confirm' } = useParams();
  const [token] = useState(takeTokenFromAddress);
  // Asked once: following the same link again would only say "doesn't work" after a removal.
  const result = useQuery({
    queryKey: ['open-here', action, token],
    queryFn: () => followLink(action, token),
    staleTime: Infinity,
    retry: false,
  });
  const countryName = (code: string) =>
    new Intl.DisplayNames([i18n.language], { type: 'region' }).of(code) ?? code;
  const words = wordsFor(result.data, countryName);

  return (
    <AuthCard
      documentTitle={t('openHere.documentTitle')}
      eyebrow={t('openHere.eyebrow')}
      heading={t(words.heading)}
      intro={words.body === null ? undefined : t(words.body, words.values)}
    >
      <Link
        to="/"
        className="inline-flex h-11 w-fit items-center rounded-full button-main px-5 text-sm font-semibold no-underline"
      >
        {t('openHere.home')}
      </Link>
    </AuthCard>
  );
}
