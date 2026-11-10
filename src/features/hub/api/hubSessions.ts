/**
 * Live sessions: the hub's list of sessions coming up, the member's reminders and the staff list
 * (bundle GAPS-12h; board WritersHub, "Live sessions · Remind me").
 *
 * Who calls it: hooks/useHubSessions.ts (the hub list and Remind me) and
 * hooks/useStaffSessions.ts (the staff page at /staff/hub).
 * What it calls next (migration gaps12h_live_sessions):
 * - writers_hub_sessions(): the sessions that haven't started, soonest first, only the ones for
 *   the caller's age group, each with whether the caller asked to be reminded. Members can't
 *   read the table itself.
 * - set_live_session_reminder(): the caller's own reminder on or off.
 * - the live_sessions table (read by staff with the contests area through its RLS policy),
 *   admin_save_live_session() and admin_delete_live_session(), which check the same area and
 *   write the audit log.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { hubStaffErrorFrom } from './hubStaffErrors';

/** The languages a session can be held in: the interface languages the database accepts. */
export const sessionLanguages = ['en', 'ro'] as const;

/** A language a session is held in. */
export type SessionLanguage = (typeof sessionLanguages)[number];

/** The age groups a session can be for, youngest first. */
export const sessionRatings: Enums<'story_rating'>[] = [
  'all_ages',
  '13_plus',
  '16_plus',
  '18_plus',
];

/** One session as the staff page shows it. */
export interface LiveSession {
  id: string;
  titleRo: string;
  titleEn: string;
  /** The moment it starts, as the database writes it (with its time zone). */
  startsAt: string;
  languageCode: SessionLanguage;
  /** The youngest age group it is for. */
  rating: Enums<'story_rating'>;
  /** One line on where it happens. */
  placeRo: string;
  placeEn: string;
  /** The address to join (https), or null while there is none. */
  linkUrl: string | null;
}

/** One session on the hub: the session and whether this member asked to be reminded. */
export type HubSession = LiveSession & { isReminded: boolean };

/** What staff fill in to add or change a session; id is null for a new one. */
export type SessionDraft = Omit<LiveSession, 'id' | 'linkUrl'> & {
  id: string | null;
  /** Empty for a session with no address yet. */
  linkUrl: string;
};

/** The longest each text may be; the database checks the same limits. */
export const sessionLimits = { title: 120, place: 80, link: 500 } as const;

/**
 * Reads a language code as one the page knows; anything else counts as English.
 *
 * @param code - the code the database holds
 * @returns "ro" or "en"
 */
function languageOf(code: string): SessionLanguage {
  return code === 'ro' ? 'ro' : 'en';
}

/**
 * The sessions coming up for this member, soonest first (at most 6).
 *
 * @param client - the shared Supabase client
 * @returns the sessions; empty when there are none for this member
 * @throws when the read fails
 */
export async function fetchHubSessions(client: AppSupabaseClient): Promise<HubSession[]> {
  const { data, error } = await client.rpc('writers_hub_sessions');
  if (error !== null) throw new Error(`Could not read the live sessions: ${error.message}`);
  return data.map((row) => ({
    id: row.session_id,
    titleRo: row.title_ro,
    titleEn: row.title_en,
    startsAt: row.starts_at,
    languageCode: languageOf(row.language_code),
    rating: row.rating,
    placeRo: row.place_ro,
    placeEn: row.place_en,
    linkUrl: row.link_url,
    isReminded: row.is_reminded,
  }));
}

/**
 * Sets this member's reminder for a session, or takes it off.
 *
 * @param client - the shared Supabase client
 * @param sessionId - the session
 * @param wanted - true to be reminded, false to cancel
 * @returns whether a reminder is set afterwards
 * @throws when the session has started, is gone or the write fails
 */
export async function setSessionReminder(
  client: AppSupabaseClient,
  sessionId: string,
  wanted: boolean,
): Promise<boolean> {
  const { data, error } = await client.rpc('set_live_session_reminder', {
    target_session: sessionId,
    wanted,
  });
  if (error !== null) throw new Error(`Could not change the reminder: ${error.message}`);
  return data;
}

/**
 * Every session that isn't deleted, latest start first, for staff (past ones included).
 *
 * @param client - the shared Supabase client
 * @returns the sessions; empty for anyone without the contests area (the policy shows them none)
 * @throws when the read fails
 */
export async function fetchStaffSessions(client: AppSupabaseClient): Promise<LiveSession[]> {
  const { data, error } = await client
    .from('live_sessions')
    .select(
      'id, title_ro, title_en, starts_at, language_code, rating, place_ro, place_en, link_url',
    )
    .order('starts_at', { ascending: false });
  if (error !== null) throw new Error(`Could not read the live sessions: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    titleRo: row.title_ro,
    titleEn: row.title_en,
    startsAt: row.starts_at,
    languageCode: languageOf(row.language_code),
    rating: row.rating,
    placeRo: row.place_ro,
    placeEn: row.place_en,
    linkUrl: row.link_url,
  }));
}

/**
 * Adds a session, or changes one; logged with the before and after values.
 *
 * @param client - the shared Supabase client
 * @param draft - the texts in both languages, the start, the language, the age group and the link
 * @returns the session's ID
 * @throws HubStaffError
 */
export async function saveSession(client: AppSupabaseClient, draft: SessionDraft): Promise<string> {
  const { data, error } = await client.rpc('admin_save_live_session', {
    // The generated types want a string; null is how a new session is asked for.
    session_id: draft.id as string,
    session: {
      title_ro: draft.titleRo,
      title_en: draft.titleEn,
      starts_at: draft.startsAt,
      language_code: draft.languageCode,
      rating: draft.rating,
      place_ro: draft.placeRo,
      place_en: draft.placeEn,
      link_url: draft.linkUrl,
    },
  });
  if (error !== null) throw hubStaffErrorFrom(error);
  return data;
}

/**
 * Takes a session off the hub and the staff list, with its waiting reminders; the audit log
 * keeps what it said.
 *
 * @param client - the shared Supabase client
 * @param sessionId - the session to delete
 * @throws HubStaffError
 */
export async function deleteSession(client: AppSupabaseClient, sessionId: string): Promise<void> {
  const { error } = await client.rpc('admin_delete_live_session', { session_id: sessionId });
  if (error !== null) throw hubStaffErrorFrom(error);
}
