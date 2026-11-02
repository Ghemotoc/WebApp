/**
 * Spaces people create (bundle FORUMS-2, part a; story S1-E8-06; board 5.3 A user space).
 *
 * Who calls it: hooks/useSpaces.ts. What it calls next: space_list(), space_page(),
 * space_name_available(), create_space(), update_space(), join_space(), leave_space(),
 * space_join_requests() and decide_space_join_request() in
 * supabase/migrations/…_forums2_a_spaces.sql. The database applies the age rules (who may see,
 * join and post) and never sends a user ID; this file only reads its answers.
 */
import { personFrom, type ForumPerson } from '@/features/forums/api/forumThreads';
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** Who a space is for (set from its starter's age, S1-E8-06 criteria 2 and 3). */
export type SpaceAgeGroup = Enums<'space_age_group'>;
/** Who reads an under-16 space: its members, or everybody (decided 17 Oct 2026, 34p). */
export type SpaceReaders = Enums<'space_readers'>;
/** Who may post: anyone in its age group, or members only. */
export type SpacePosting = Enums<'space_posting'>;
/** How people join: the owner approves, or straight away. */
export type SpaceJoining = Enums<'space_joining'>;
/** The drawn banner colour (board 5.3). */
export type SpaceBanner = Enums<'space_banner'>;

/** The banner colours in the board's order. */
export const spaceBanners: SpaceBanner[] = ['plum', 'night', 'forest', 'gold'];

/** The caller's place in a space. */
export type SpaceMembership = 'owner' | 'member' | 'pending' | null;

/** What the caller may do in a space (the database decides; the server checks again). */
export interface SpaceViewer {
  membership: SpaceMembership;
  canRead: boolean;
  canJoin: boolean;
  canPost: boolean;
  /** The owner: settings and requests. */
  canManage: boolean;
}

/** A space as the screens show it. */
export interface Space {
  /** The space's own ID, for its Report button; never a person's ID. */
  id: string;
  slug: string;
  /** The hidden forum that holds its threads ("space-…"). */
  forumSlug: string;
  name: string;
  description: string;
  /** One rule a line, as the owner wrote them. */
  rules: string[];
  /** Null when the caller isn't told (an adult reading an under-16 space opened to everybody). */
  ageGroup: SpaceAgeGroup | null;
  readers: SpaceReaders;
  posting: SpacePosting;
  joining: SpaceJoining;
  banner: SpaceBanner;
  owner: ForumPerson;
  memberCount: number;
  threadCount: number;
  latestActivityAt: string;
  viewer: SpaceViewer;
}

/** One page of the spaces the caller may see. */
export interface SpaceListPage {
  spaces: Space[];
  total: number;
  hasMore: boolean;
}

/** A request waiting for the owner. */
export interface SpaceJoinRequest {
  person: ForumPerson;
  requestedAt: string;
}

/** The settings a space is started or changed with. */
export interface SpaceSettings {
  name: string;
  description: string;
  rules: string;
  posting: SpacePosting;
  joining: SpaceJoining;
  /** Only an under-16 space uses it; a 16+ space is read by everybody. */
  readers: SpaceReaders;
  banner: SpaceBanner;
}

/** Why the database refused a space change. */
export type SpaceFailure =
  | 'signed_out'
  | 'not_active'
  | 'age_unknown'
  | 'age'
  | 'not_owner'
  | 'owner_leaving'
  | 'missing'
  | 'too_many'
  | 'invalid'
  | 'unreachable';

/** A field the database found a problem with ("name:taken", "rules:too_long"…). */
export interface SpaceFieldProblem {
  field: 'name' | 'description' | 'rules';
  problem: 'empty' | 'too_long' | 'html' | 'taken';
}

/** The error a refused space change throws. */
export class SpaceError extends Error {
  /**
   * @param failure - why it was refused
   * @param details - the field's problem for 'invalid'; the minutes to wait for 'too_many'
   */
  constructor(
    readonly failure: SpaceFailure,
    readonly details: { field?: SpaceFieldProblem; waitMinutes?: number | null } = {},
  ) {
    super(`The space was refused: ${failure}`);
    this.name = 'SpaceError';
  }
}

/** The 42501 hints and what they mean. */
const privilegeHints: Record<string, SpaceFailure> = {
  signed_out: 'signed_out',
  not_active: 'not_active',
  'space:age_unknown': 'age_unknown',
  'space:age': 'age',
  'space:not_owner': 'not_owner',
};

/**
 * Reads a field hint such as "name:taken".
 *
 * @param hint - the database's hint
 * @returns the field and problem, or undefined for a hint that isn't about a field
 */
export function fieldProblemFrom(hint: string): SpaceFieldProblem | undefined {
  const [field, problem] = hint.split(':');
  const fields = ['name', 'description', 'rules'];
  const problems = ['empty', 'too_long', 'html', 'taken'];
  if (field === undefined || problem === undefined) return undefined;
  if (!fields.includes(field) || !problems.includes(problem)) return undefined;
  return { field, problem } as SpaceFieldProblem;
}

/**
 * Turns a database error into a SpaceError.
 *
 * @param error - Postgres's code and hint
 * @returns the failure: by hint for 42501 and 23514, too_many for 54000, missing for P0002
 */
export function spaceErrorFrom(error: { code?: string; hint?: string | null }): SpaceError {
  const hint = error.hint ?? '';
  if (error.code === '42501') return new SpaceError(privilegeHints[hint] ?? 'not_active');
  if (error.code === '54000') {
    const minutes = Number(hint.replace('wait_minutes:', ''));
    return new SpaceError('too_many', { waitMinutes: minutes > 0 ? minutes : null });
  }
  if (error.code === 'P0002') return new SpaceError('missing');
  if (error.code === '23514') {
    if (hint === 'space:owner') return new SpaceError('owner_leaving');
    const field = fieldProblemFrom(hint);
    return field === undefined
      ? new SpaceError('unreachable')
      : new SpaceError('invalid', { field });
  }
  return new SpaceError('unreachable');
}

/** A JSON object as the database sends it. */
type JsonObject = Record<string, Json | undefined>;

/**
 * Reads a JSON value as an object.
 *
 * @param value - any JSON value
 * @returns the object, or an empty one for anything else
 */
function objectOf(value: Json | undefined): JsonObject {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value))
    return {};
  return value;
}

/**
 * Reads the caller's place in a space.
 *
 * @param value - space_viewer_json()'s answer
 * @returns what they may do
 */
function viewerFrom(value: Json | undefined): SpaceViewer {
  const viewer = objectOf(value);
  const memberships: SpaceMembership[] = ['owner', 'member', 'pending'];
  const membership = memberships.find((known) => known === viewer['membership']) ?? null;
  return {
    membership,
    canRead: viewer['can_read'] === true,
    canJoin: viewer['can_join'] === true,
    canPost: viewer['can_post'] === true,
    canManage: viewer['can_manage'] === true,
  };
}

/**
 * Splits the rules into lines, leaving out empty ones.
 *
 * @param value - the rules as stored
 * @returns one rule a line
 */
export function rulesFrom(value: Json | undefined): string[] {
  const text = typeof value === 'string' ? value : '';
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/**
 * Reads a space's age group, which the database leaves out for readers outside it.
 *
 * @param value - the "age_group" field
 * @returns the group, or null
 */
function ageGroupFrom(value: Json | undefined): SpaceAgeGroup | null {
  if (value === 'under_16' || value === '16_plus') return value;
  return null;
}

/**
 * Reads a count, zero when missing.
 *
 * @param value - a count field
 * @returns the number
 */
function countFrom(value: Json | undefined): number {
  return Number(value ?? 0);
}

/**
 * Reads one space.
 *
 * @param value - space_json()'s answer
 * @returns the space
 */
export function spaceFrom(value: Json | undefined): Space {
  const row = objectOf(value);
  return {
    id: String(row['id']),
    slug: String(row['slug']),
    forumSlug: String(row['forum_slug']),
    name: String(row['name']),
    description: String(row['description'] ?? ''),
    rules: rulesFrom(row['rules']),
    ageGroup: ageGroupFrom(row['age_group']),
    readers: row['readers'] === 'members' ? 'members' : 'everybody',
    posting: row['posting'] === 'anyone' ? 'anyone' : 'members',
    joining: row['joining'] === 'open' ? 'open' : 'approve',
    banner: spaceBanners.find((banner) => banner === row['banner']) ?? 'plum',
    owner: personFrom(row['owner']),
    memberCount: countFrom(row['member_count']),
    threadCount: countFrom(row['thread_count']),
    latestActivityAt: String(row['latest_activity_at'] ?? ''),
    viewer: viewerFrom(row['viewer']),
  };
}

/**
 * Reads the spaces the caller may see, busiest first.
 *
 * @param client - the Supabase client
 * @param skip - how many the page already shows
 * @param howMany - how many to read (at most 50)
 * @returns the page
 * @throws Error in plain words when the database can't be reached
 */
export async function fetchSpaceList(
  client: AppSupabaseClient,
  skip: number,
  howMany: number,
): Promise<SpaceListPage> {
  const { data, error } = await client.rpc('space_list', { skip, how_many: howMany });
  if (error) throw new Error(`Could not read the spaces: ${error.message}`);
  const page = objectOf(data);
  const spaces = Array.isArray(page['spaces']) ? page['spaces'].map(spaceFrom) : [];
  return { spaces, total: Number(page['total'] ?? 0), hasMore: page['has_more'] === true };
}

/**
 * Reads one space for its page.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @returns the space, or null when there is none or the caller may not see it
 * @throws Error in plain words when the database can't be reached
 */
export async function fetchSpace(client: AppSupabaseClient, slug: string): Promise<Space | null> {
  const { data, error } = await client.rpc('space_page', { slug });
  if (error) throw new Error(`Could not read the space: ${error.message}`);
  return data === null ? null : spaceFrom(data);
}

/**
 * Asks whether a name is free, for the form's "This name is available."
 *
 * @param client - the Supabase client
 * @param name - the name as typed
 * @returns null when it is free, otherwise the problem
 * @throws Error in plain words when the database can't be reached
 */
export async function checkSpaceName(
  client: AppSupabaseClient,
  name: string,
): Promise<SpaceFieldProblem | null> {
  const { data, error } = await client.rpc('space_name_available', { name });
  if (error) throw new Error(`Could not check the name: ${error.message}`);
  const answer = objectOf(data);
  if (answer['available'] === true) return null;
  return fieldProblemFrom(String(answer['problem'] ?? '')) ?? { field: 'name', problem: 'taken' };
}

/**
 * Starts a space; the caller becomes its owner.
 *
 * @param client - the Supabase client
 * @param settings - the name, words and settings
 * @returns the new space's address
 * @throws SpaceError when refused
 */
export async function createSpace(
  client: AppSupabaseClient,
  settings: SpaceSettings,
): Promise<string> {
  const { data, error } = await client.rpc('create_space', settings);
  if (error) throw spaceErrorFrom(error);
  return String(objectOf(data)['slug']);
}

/**
 * The owner changes a space's name, words and settings.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @param settings - the new name, words and settings
 * @returns the changed space
 * @throws SpaceError when refused
 */
export async function updateSpace(
  client: AppSupabaseClient,
  slug: string,
  settings: SpaceSettings,
): Promise<Space> {
  const { data, error } = await client.rpc('update_space', { slug, ...settings });
  if (error) throw spaceErrorFrom(error);
  return spaceFrom(data);
}

/**
 * Joins a space, or asks its owner.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @returns 'active' when in, 'pending' while the owner decides
 * @throws SpaceError when refused
 */
export async function joinSpace(
  client: AppSupabaseClient,
  slug: string,
): Promise<'active' | 'pending'> {
  const { data, error } = await client.rpc('join_space', { slug });
  if (error) throw spaceErrorFrom(error);
  return objectOf(data)['status'] === 'active' ? 'active' : 'pending';
}

/**
 * Leaves a space, or takes back a request.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @throws SpaceError when refused (the owner can't leave)
 */
export async function leaveSpace(client: AppSupabaseClient, slug: string): Promise<void> {
  const { error } = await client.rpc('leave_space', { slug });
  if (error) throw spaceErrorFrom(error);
}

/**
 * Reads the requests waiting for the owner, oldest first.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @returns the requests
 * @throws SpaceError when refused (only the owner sees them)
 */
export async function fetchJoinRequests(
  client: AppSupabaseClient,
  slug: string,
): Promise<SpaceJoinRequest[]> {
  const { data, error } = await client.rpc('space_join_requests', { slug });
  if (error) throw spaceErrorFrom(error);
  const rows = Array.isArray(data) ? data.map(objectOf) : [];
  return rows.map((row) => ({
    person: personFrom(row['person']),
    requestedAt: String(row['requested_at']),
  }));
}

/** What became of a request. */
export type JoinRequestOutcome = 'approved' | 'declined' | 'age_changed';

/**
 * The owner lets someone in, or says no.
 *
 * @param client - the Supabase client
 * @param decision - the space, the person's username and the answer
 * @returns what became of the request ('age_changed' when the person turned 16 while waiting)
 * @throws SpaceError when refused
 */
export async function decideJoinRequest(
  client: AppSupabaseClient,
  decision: { slug: string; handle: string; approve: boolean },
): Promise<JoinRequestOutcome> {
  const { data, error } = await client.rpc('decide_space_join_request', decision);
  if (error) throw spaceErrorFrom(error);
  const outcome = objectOf(data)['outcome'];
  if (outcome === 'approved' || outcome === 'age_changed') return outcome;
  return 'declined';
}

/**
 * Reads which spaces the signed-in person would start, for the create form's note.
 *
 * @param client - the Supabase client
 * @returns 'under_16', '16_plus', or null when their age isn't known yet
 * @throws Error in plain words when the database can't be reached
 */
export async function fetchMyAgeGroup(client: AppSupabaseClient): Promise<SpaceAgeGroup | null> {
  const { data, error } = await client.rpc('my_space_age_group');
  if (error) throw new Error(`Could not read your age group: ${error.message}`);
  return data === 'under_16' || data === '16_plus' ? data : null;
}
