/**
 * Spaces people create (bundle FORUMS-2, part a; story S1-E8-06; board 5.3 A user space).
 *
 * Who calls it: hooks/useSpaces.ts. What it calls next: space_list(), space_page(),
 * space_name_available(), create_space(), update_space(), join_space(), leave_space(),
 * space_join_requests() and decide_space_join_request() in
 * supabase/migrations/…_forums2_a_spaces.sql (the powers and "moderator" from
 * …_forums2_b_space_moderators.sql, S1-E8-07; the moderators' own calls are in spaceModeration.ts;
 * a class space's kind and invite card from …_classes_a_class_spaces.sql, S1-E8-11, whose own
 * calls are in classSpaces.ts; the note with a request to join from …_ideas3_d_joining_spaces.sql,
 * IDEAS-3d, whose welcome note calls are in spaceWelcome.ts). The database applies the age rules (who may see,
 * join and post) and never sends a user ID; this file only reads its answers.
 */
import { personFrom, type ForumPerson } from '@/features/forums/api/forumThreads';
import { pictureFromJson, type StoredPicture } from '@/features/pictures/api/pictures';
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
/**
 * The banner colour: one of the fourteen the boards offer (G8b; SpaceSettings and SpaceNew).
 * The database keeps the retired 'night' and 'gold' in its type but no space can use them
 * (spaces_banner_is_offered), so the screens never meet them.
 */
export type SpaceBanner = Exclude<Enums<'space_banner'>, 'night' | 'gold'>;
/** An open space (S1-E8-06) or a private class space joined by invite code (S1-E8-11). */
export type SpaceKind = Enums<'space_kind'>;

/** The deep banner colours in the board's order; a space's text on them is white. */
export const deepSpaceBanners: SpaceBanner[] = [
  'plum',
  'cobalt',
  'forest',
  'ember',
  'rose',
  'teal',
  'berry',
  'ink',
];

/** The pastel banner colours in the board's order; a space's text on them is dark. */
export const pastelSpaceBanners: SpaceBanner[] = [
  'lilac',
  'sky_mist',
  'peach',
  'mint',
  'butter',
  'blush',
];

/** Every banner colour in the board's order: the deep ones, then the pastels. */
export const spaceBanners: SpaceBanner[] = [...deepSpaceBanners, ...pastelSpaceBanners];

/** The caller's place in a space. */
export type SpaceMembership = 'owner' | 'moderator' | 'member' | 'pending' | null;

/**
 * A job the owner hands a moderator (S1-E8-07 criterion 1): posts (pin and lock threads),
 * members (requests, the member list, removing members) and settings. "mail" is kept for the
 * moderators' mail, which comes later, and isn't offered yet.
 */
export type SpacePower = Enums<'space_power'>;

/** The powers the owner can hand out today, in the order the screens list them. */
export const spacePowers: SpacePower[] = ['posts', 'members', 'settings'];

/** What the caller may do in a space (the database decides; the server checks again). */
export interface SpaceViewer {
  membership: SpaceMembership;
  canRead: boolean;
  canJoin: boolean;
  canPost: boolean;
  /** The settings power: the owner, a moderator holding it, or our moderation team. */
  canManage: boolean;
  /** Appoints moderators: the owner and our moderation team only. */
  canAppoint: boolean;
  /** Reads the space's log: the owner and our moderation team only (criterion 2). */
  canReadLog: boolean;
  /** A class space's invite card (S1-E8-11): the teacher, moderators with the members power, staff. */
  canInvite: boolean;
  /** A class member who can't read yet: their age check or a parent's consent is still to come. */
  waitsForAccount: boolean;
  /** Every power the caller holds; the owner holds them all. */
  powers: SpacePower[];
  /** The welcome note, for members and the people who run the space (IDEAS-3d); null otherwise. */
  welcomeNote: string | null;
  /** True for a member who hasn't pressed "Got it" on the welcome note yet. */
  showWelcome: boolean;
  /** The owner, who may offer the space to one of its moderators (IDEAS-3e). */
  canHandOver: boolean;
  /** The open offer, for the owner and the moderator it is for (IDEAS-3e); null otherwise. */
  handover: SpaceHandover | null;
}

/** An open offer to hand a space over (IDEAS-3e, idea IDEA-20261102-7). */
export interface SpaceHandover {
  /** The moderator it is offered to. */
  to: ForumPerson;
  /** The owner who offered it. */
  from: ForumPerson;
  offeredAt: string;
  /** The reader is the moderator it is offered to, and may accept or decline. */
  isForMe: boolean;
}

/** A space as the screens show it. */
export interface Space {
  /** The space's own ID, for its Report button; never a person's ID. */
  id: string;
  slug: string;
  /** The hidden forum that holds its threads ("space-…"). */
  forumSlug: string;
  name: string;
  /** 'class' for a private class space (S1-E8-11), 'open' for every other space. */
  kind: SpaceKind;
  /** When a class space locks (CLASSES-b, S1-E8-11), or null; always null for an open space. */
  locksAt: string | null;
  /** True once a class space has locked: nobody posts or joins, members still read. */
  isLocked: boolean;
  /** True once a class space is archived: locked for good (CLASSES-d, S1-E8-11 criterion 8). */
  isArchived: boolean;
  /** The school a class belongs to, printed on class certificates; null when unknown. */
  schoolName: string | null;
  description: string;
  /** One rule a line, as the owner wrote them. */
  rules: string[];
  /** Null when the caller isn't told (an adult reading an under-16 space opened to everybody). */
  ageGroup: SpaceAgeGroup | null;
  readers: SpaceReaders;
  posting: SpacePosting;
  joining: SpaceJoining;
  banner: SpaceBanner;
  /**
   * The uploaded banner picture (FORUMS-2c), or null for the drawn colour. Its file is named only
   * when the caller may read it: once it passed its check, or to its uploader and staff.
   */
  bannerPicture: StoredPicture | null;
  /**
   * The space's logo (G8b), or null when it has none, and the boards then show no picture at all.
   * Its file is named only when the caller may read it, as for the banner picture.
   */
  logoPicture: StoredPicture | null;
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
  /** The note sent with the request (IDEAS-3d), with its ID for the Report button; or null. */
  note: SpaceJoinNote | null;
}

/** A note with a request to join: its own ID (never a person's) and its words. */
export interface SpaceJoinNote {
  id: string;
  text: string;
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
  | 'not_allowed'
  | 'owner_leaving'
  | 'member_missing'
  | 'member_owner'
  | 'member_age'
  | 'request_missing'
  | 'reason_too_long'
  | 'missing'
  | 'too_many'
  | 'invalid'
  | 'class_only'
  | 'not_teacher'
  | 'handover_missing'
  | 'handover_not_moderator'
  | 'handover_age'
  | 'handover_not_teacher'
  | 'unreachable';

/** A field the database found a problem with ("name:taken", "rules:too_long"…). */
export interface SpaceFieldProblem {
  /** The space's own fields, the welcome note and the note with a request to join (IDEAS-3d). */
  field: 'name' | 'description' | 'rules' | 'welcome' | 'join_note';
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
  'space:not_allowed': 'not_allowed',
  // S1-E8-11: a class space takes its teacher's code; only teachers start one.
  'space:class': 'class_only',
  'space:not_teacher': 'not_teacher',
};

/** The 23514 and P0002 hints that aren't about a form field, and what they mean. */
const otherHints: Record<string, SpaceFailure> = {
  'space:owner': 'owner_leaving',
  'space:missing': 'missing',
  'member:missing': 'member_missing',
  'member:owner': 'member_owner',
  'member:age': 'member_age',
  'request:missing': 'request_missing',
  'reason:too_long': 'reason_too_long',
  // IDEAS-3e: an offer that is gone, or a moderator who can't take the space over.
  'handover:missing': 'handover_missing',
  'handover:not_moderator': 'handover_not_moderator',
  'handover:age': 'handover_age',
  'handover:not_teacher': 'handover_not_teacher',
};

/**
 * Reads a field hint such as "name:taken".
 *
 * @param hint - the database's hint
 * @returns the field and problem, or undefined for a hint that isn't about a field
 */
export function fieldProblemFrom(hint: string): SpaceFieldProblem | undefined {
  const [field, problem] = hint.split(':');
  const fields = ['name', 'description', 'rules', 'welcome', 'join_note'];
  const problems = ['empty', 'too_long', 'html', 'taken'];
  if (field === undefined || problem === undefined) return undefined;
  if (!fields.includes(field) || !problems.includes(problem)) return undefined;
  return { field, problem } as SpaceFieldProblem;
}

/**
 * Turns a database error into a SpaceError.
 *
 * @param error - Postgres's code and hint
 * @returns the failure: by hint for 42501, 23514 and P0002, too_many for 54000
 */
export function spaceErrorFrom(error: { code?: string; hint?: string | null }): SpaceError {
  const hint = error.hint ?? '';
  // Step 1: not allowed (signed out, not active, not the owner, no such power).
  if (error.code === '42501') return new SpaceError(privilegeHints[hint] ?? 'not_active');
  // Step 2: the spam limit, with how long to wait.
  if (error.code === '54000') {
    const minutes = Number(hint.replace('wait_minutes:', ''));
    return new SpaceError('too_many', { waitMinutes: minutes > 0 ? minutes : null });
  }
  // Step 3: a refusal named by its hint ("member:age"), or a space that isn't there.
  const named = otherHints[hint];
  if (named !== undefined) return new SpaceError(named);
  if (error.code === 'P0002') return new SpaceError('missing');
  // Step 4: a form field's problem ("name:taken").
  const field = error.code === '23514' ? fieldProblemFrom(hint) : undefined;
  if (field !== undefined) return new SpaceError('invalid', { field });
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
  const memberships: SpaceMembership[] = ['owner', 'moderator', 'member', 'pending'];
  const membership = memberships.find((known) => known === viewer['membership']) ?? null;
  return {
    membership,
    canRead: viewer['can_read'] === true,
    canJoin: viewer['can_join'] === true,
    canPost: viewer['can_post'] === true,
    canManage: viewer['can_manage'] === true,
    canAppoint: viewer['can_appoint'] === true,
    canReadLog: viewer['can_read_log'] === true,
    canInvite: viewer['can_invite'] === true,
    waitsForAccount: viewer['waits_for_account'] === true,
    powers: powersFrom(viewer['powers']),
    welcomeNote: typeof viewer['welcome_note'] === 'string' ? viewer['welcome_note'] : null,
    showWelcome: viewer['show_welcome'] === true,
    canHandOver: viewer['can_hand_over'] === true,
    handover: handoverFrom(viewer['handover']),
  };
}

/**
 * Reads the open offer to hand the space over (IDEAS-3e).
 *
 * @param value - space_handover_json()'s answer: null when there is none for this reader
 * @returns the offer, or null
 */
function handoverFrom(value: Json | undefined): SpaceHandover | null {
  const handover = objectOf(value);
  if (typeof handover['offered_at'] !== 'string') return null;
  return {
    to: personFrom(handover['to']),
    from: personFrom(handover['from']),
    offeredAt: handover['offered_at'],
    isForMe: handover['is_for_me'] === true,
  };
}

/**
 * Reads a list of powers, keeping only the ones the screens know.
 *
 * @param value - a JSON array of power names
 * @returns the powers, in the database's order
 */
export function powersFrom(value: Json | undefined): SpacePower[] {
  if (!Array.isArray(value)) return [];
  const known: SpacePower[] = ['posts', 'members', 'settings', 'mail'];
  return known.filter((power) => value.includes(power));
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
 * A text value, or null when the database sent anything else.
 *
 * @param value - one field of the answer
 * @returns the text, or null
 */
function textOrNull(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null;
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
    kind: row['kind'] === 'class' ? 'class' : 'open',
    locksAt: textOrNull(row['locks_at']),
    isLocked: row['is_locked'] === true,
    isArchived: row['is_archived'] === true,
    schoolName: textOrNull(row['school_name']),
    description: String(row['description'] ?? ''),
    rules: rulesFrom(row['rules']),
    ageGroup: ageGroupFrom(row['age_group']),
    readers: row['readers'] === 'members' ? 'members' : 'everybody',
    posting: row['posting'] === 'anyone' ? 'anyone' : 'members',
    joining: row['joining'] === 'open' ? 'open' : 'approve',
    banner: spaceBanners.find((banner) => banner === row['banner']) ?? 'plum',
    bannerPicture: pictureFromJson(row['banner_picture'] ?? null),
    logoPicture: pictureFromJson(row['logo_picture'] ?? null),
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
 * @param note - an optional note for a space that approves each request (IDEAS-3d), at most 200
 *   characters; the database ignores it when joining an open space
 * @returns 'active' when in, 'pending' while the owner decides
 * @throws SpaceError when refused (a note that is too long or holds HTML: 'invalid', join_note)
 */
export async function joinSpace(
  client: AppSupabaseClient,
  slug: string,
  note = '',
): Promise<'active' | 'pending'> {
  const trimmed = note.trim();
  const args = trimmed === '' ? { slug } : { slug, note: trimmed };
  const { data, error } = await client.rpc('join_space', args);
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
 * Reads the requests waiting for the owner or a moderator with the members power, oldest first.
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
    note: joinNoteFrom(row['note']),
  }));
}

/**
 * Reads the note sent with a request.
 *
 * @param value - the request's "note" ({"id", "text"} or null)
 * @returns the note, or null when there is none (or our moderators hid it)
 */
export function joinNoteFrom(value: Json | undefined): SpaceJoinNote | null {
  const note = objectOf(value);
  const id = textOrNull(note['id']);
  const text = textOrNull(note['text']);
  if (id === null || text === null) return null;
  return { id, text };
}

/** What became of a request. */
export type JoinRequestOutcome = 'approved' | 'declined' | 'age_changed';

/**
 * The owner (or a moderator with the members power) lets someone in, or says no.
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
