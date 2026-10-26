/**
 * The public-domain check, as the staff form shows it while staff type (story S1-E11-16 AC 2).
 *
 * Who calls it: components/classics/FreeMarketsList.tsx. What it calls: nothing. It mirrors the
 * database's classic_free_markets() so the answer appears before saving; the database decides
 * again on publish, so a difference can never publish a protected work.
 * The rule (Law 8/1996 art. 28(1) and 34; research G5): Romania, the EU and the UK, free from
 * 1 January of the 71st year after the death of the author, and of the translator for a
 * translation; the US, first published 95 or more years before that year.
 */
import { ROMANIA_TIME_ZONE } from '@/lib/romania-time';

import type { FreeMarkets } from '../api/classics';

/** The years the check needs; null where staff left a field blank. */
export interface PublicDomainYears {
  authorDied: number | null;
  translatorDied: number | null;
  firstPublished: number | null;
}

/**
 * Where a work is free in a given year.
 *
 * @param years - the author's and translator's years of death and the first publication year
 * @param thisYear - the year to check (Romanian date)
 * @returns each market's answer; null without the author's year (nothing can be said yet)
 */
export function freeMarketsIn(years: PublicDomainYears, thisYear: number): FreeMarkets | null {
  if (years.authorDied === null) return null;
  const translatorIsFree = years.translatorDied === null || years.translatorDied + 70 < thisYear;
  const isFree = years.authorDied + 70 < thisYear && translatorIsFree;
  const usIsFree = years.firstPublished === null ? null : years.firstPublished + 95 < thisYear;
  return { RO: isFree, EU: isFree, UK: isFree, US: usIsFree };
}

/**
 * The year on the Romanian calendar, as the database counts it (so 31 December late at night in
 * London is already the next year in Bucharest).
 *
 * @param now - the moment
 * @returns the year
 */
export function romanianYear(now: Date): number {
  const year = new Intl.DateTimeFormat('en-GB', {
    timeZone: ROMANIA_TIME_ZONE,
    year: 'numeric',
  }).format(now);
  return Number(year);
}
