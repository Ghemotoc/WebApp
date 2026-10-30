/**
 * Sorts an entry's versions into what the editor shows: the draft, the live version, the one
 * scheduled to replace it and the earlier ones (story S1-E11-06 criteria 1, 6 and 7).
 *
 * The rule matches the database's cms_live_versions(): live is the published version with the
 * latest "show from" date that is today or earlier in Romanian time (ties: the latest published).
 * Who calls it: the staff editors, through hooks/useWebsiteEditor.ts.
 */
import { ROMANIA_TIME_ZONE } from '@/lib/romania-time';

import type { ContentVersion } from '../api/websiteContentStore';

/** Today in Romania as YYYY-MM-DD (en-CA writes dates that way). */
const romanianDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: ROMANIA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Today's date in Romania.
 *
 * @param now - the moment (the clock, or a fixed time in tests)
 * @returns for example "2026-11-02"
 */
export function romaniaDateOf(now: Date): string {
  return romanianDay.format(now);
}

/** One entry's versions, sorted. */
export interface EntryVersions {
  draft: ContentVersion | null;
  live: ContentVersion | null;
  /** The next version waiting for its date, if any. */
  scheduled: ContentVersion | null;
  /** Every other published version, newest first, for Restore. */
  earlier: ContentVersion[];
}

/**
 * Orders published versions newest first: by "show from", then by when they were published.
 *
 * @returns the comparison
 */
function newestFirst(first: ContentVersion, second: ContentVersion): number {
  const byDate = (second.showFrom ?? '').localeCompare(first.showFrom ?? '');
  if (byDate !== 0) return byDate;
  return (second.publishedAt ?? '').localeCompare(first.publishedAt ?? '');
}

/**
 * Sorts one entry's versions.
 *
 * @param versions - every version of one entry in one market and language
 * @param today - today in Romania (romaniaDateOf)
 * @returns the draft, live, scheduled and earlier versions
 */
export function sortEntryVersions(versions: ContentVersion[], today: string): EntryVersions {
  const published = versions.filter((version) => version.status === 'published').sort(newestFirst);
  const started = published.filter((version) => (version.showFrom ?? '') <= today);
  const waiting = published.filter((version) => (version.showFrom ?? '') > today);
  const latestStarted = started[0] ?? null;
  const live = latestStarted === null || latestStarted.isRemoval ? null : latestStarted;
  return {
    draft: versions.find((version) => version.status === 'draft') ?? null,
    live,
    scheduled: waiting.length === 0 ? null : (waiting[waiting.length - 1] ?? null),
    earlier: published.filter(
      (version) => version !== live && !waiting.includes(version) && !version.isRemoval,
    ),
  };
}

/**
 * Groups a market's versions by entry and language, for the lists of notices, pages and questions.
 *
 * @param versions - every version of one kind in one market
 * @returns a map from "entry|language" to that entry's versions
 */
export function groupByEntry(versions: ContentVersion[]): Map<string, ContentVersion[]> {
  const groups = new Map<string, ContentVersion[]>();
  for (const version of versions) {
    const groupKey = `${version.entryKey}|${version.languageCode ?? ''}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), version]);
  }
  return groups;
}

/** What state an entry is in, for its row in a list. */
export type EntryState = 'live' | 'scheduled' | 'draft' | 'ended';

/**
 * Says what state an entry is in.
 *
 * @param entry - its sorted versions
 * @returns live, scheduled, draft or ended (taken down, or a notice past its date)
 */
export function entryStateOf(entry: EntryVersions): EntryState {
  if (entry.live !== null) return 'live';
  if (entry.scheduled !== null) return 'scheduled';
  if (entry.draft !== null) return 'draft';
  return 'ended';
}
