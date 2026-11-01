/**
 * Private messages: the chats list, one chat, sending, answering a request, reading and the
 * caller's own message setting (story S1-E9-01; who may write is S1-E9-03).
 *
 * Who calls it: the hooks in ../hooks (the /messages pages and the top bar's Messages link).
 * What it calls next: my_conversations(), conversation_with(), send_message(),
 * answer_message_request(), mark_conversation_read(), unread_message_count() and
 * my_message_settings() (…_s1_e9_01_private_messages.sql). Every rule is in the database; a
 * refusal never says why (the neutral "isn't taking messages right now", S1-E9-03).
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** Where a chat stands: a request, accepted, or declined by the recipient. */
export type ConversationStatus = Enums<'conversation_status'>;

/** Who may start a chat with a person (S1-E9-03). */
export type MessageAudience = Enums<'message_audience'>;

/** One chat in the list. */
export interface ConversationSummary {
  otherHandle: string;
  otherDisplayName: string;
  status: ConversationStatus;
  /** A request waiting for the caller's answer: it belongs under "Requests". */
  isRequestToMe: boolean;
  /** The last message's first words, or null when staff removed it. */
  lastMessagePreview: string | null;
  lastMessageFromMe: boolean;
  lastMessageAt: string;
  hasUnread: boolean;
}

/** One message in a chat. */
export interface ChatMessage {
  id: string;
  fromMe: boolean;
  /** Null when the moderation team removed it for this reader. */
  body: string | null;
  at: string;
}

/** One chat, as the caller sees it. */
export interface Conversation {
  handle: string;
  displayName: string;
  /** Null before the first message. */
  status: ConversationStatus | null;
  isRequestToMe: boolean;
  /** The caller's own request isn't accepted yet, so they can't send more. */
  isWaiting: boolean;
  canSend: boolean;
  iFollow: boolean;
  theyFollow: boolean;
  messages: ChatMessage[];
}

/** The caller's own setting and age group, for the notice over the list. */
export interface MyMessageSettings {
  audience: MessageAudience;
  ageGroup: 'adult' | 'teen' | 'child';
  adultsMayMessage: boolean;
}

/** Why a call didn't work. */
export type MessagesFailure = 'not_taking' | 'refused' | 'not_found' | 'too_many' | 'unreachable';

/** The error a refused call throws; waitMinutes is set for too_many. */
export class MessagesError extends Error {
  constructor(
    public readonly failure: MessagesFailure,
    public readonly waitMinutes: number | null = null,
  ) {
    super(`Messages call failed: ${failure}`);
  }
}

/** The longest message the database takes (a proposal). */
export const longestMessage = 2000;

/**
 * Turns a database error into a MessagesError.
 *
 * @param error - Postgres's code and hint
 * @returns the error to throw
 */
export function messagesErrorFrom(error: { code: string; hint?: string | null }): MessagesError {
  if (error.code === '54000') {
    const minutes = /wait_minutes:(\d+)/.exec(error.hint ?? '')?.[1];
    return new MessagesError('too_many', minutes === undefined ? null : Number(minutes));
  }
  if (error.code === '42501') return new MessagesError('not_taking');
  if (error.code === '23514') return new MessagesError('refused');
  if (error.code === 'P0002') return new MessagesError('not_found');
  return new MessagesError('unreachable');
}

/** A JSON object's field, read safely. */
type JsonRecord = Record<string, Json | undefined>;

/** Whether a JSON value is an object (not a list). */
function isRecord(value: Json | undefined): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Reads a text field, or null. */
function textOf(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/** Reads a status, or null before the first message. */
function statusOf(value: Json | undefined): ConversationStatus | null {
  if (value === 'request' || value === 'accepted' || value === 'declined') return value;
  return null;
}

/**
 * Reads one message of a chat's JSON.
 *
 * @returns the message, or nothing for a malformed entry
 */
function messageFromJson(value: Json): ChatMessage[] {
  if (!isRecord(value)) return [];
  return [
    {
      id: textOf(value, 'id') ?? '',
      fromMe: value.from_me === true,
      body: textOf(value, 'body'),
      at: textOf(value, 'at') ?? '',
    },
  ];
}

/**
 * Reads conversation_with()'s JSON.
 *
 * @param json - as the database returns it
 * @returns the chat, or null when there is nobody the caller may see by that name
 */
export function conversationFromJson(json: Json | null): Conversation | null {
  if (json === null || !isRecord(json)) return null;
  const messages = Array.isArray(json.messages) ? json.messages : [];
  return {
    handle: textOf(json, 'handle') ?? '',
    displayName: textOf(json, 'display_name') ?? '',
    status: statusOf(json.status),
    isRequestToMe: json.is_request_to_me === true,
    isWaiting: json.is_waiting === true,
    canSend: json.can_send === true,
    iFollow: json.i_follow === true,
    theyFollow: json.they_follow === true,
    messages: messages.flatMap(messageFromJson),
  };
}

/**
 * The caller's chats and requests, newest first.
 *
 * @throws MessagesError
 */
export async function fetchConversations(
  client: AppSupabaseClient,
): Promise<ConversationSummary[]> {
  const { data, error } = await client.rpc('my_conversations');
  if (error !== null) throw messagesErrorFrom(error);
  return data.map((row) => ({
    otherHandle: row.other_handle,
    otherDisplayName: row.other_display_name,
    status: row.status,
    isRequestToMe: row.is_request_to_me,
    lastMessagePreview: row.last_message_preview,
    lastMessageFromMe: row.last_message_from_me,
    lastMessageAt: row.last_message_at,
    hasUnread: row.has_unread,
  }));
}

/**
 * One chat by the other person's username.
 *
 * @returns the chat, or null when there is nobody the caller may see by that name
 * @throws MessagesError
 */
export async function fetchConversation(
  client: AppSupabaseClient,
  handle: string,
): Promise<Conversation | null> {
  const { data, error } = await client.rpc('conversation_with', { other_handle: handle });
  if (error !== null) throw messagesErrorFrom(error);
  return conversationFromJson(data);
}

/**
 * Sends one message, starting the chat or a request when there is none.
 *
 * @returns the chat's status afterwards
 * @throws MessagesError (not_taking: the caller may not write; refused: empty or too long;
 *   not_found: no such username; too_many: the hourly limit)
 */
export async function sendMessage(
  client: AppSupabaseClient,
  handle: string,
  body: string,
): Promise<ConversationStatus | null> {
  const { data, error } = await client.rpc('send_message', { recipient_handle: handle, body });
  if (error !== null) throw messagesErrorFrom(error);
  return isRecord(data) ? statusOf(data.status) : null;
}

/**
 * Accepts or deletes a request from this person.
 *
 * @throws MessagesError
 */
export async function answerRequest(
  client: AppSupabaseClient,
  handle: string,
  shouldAccept: boolean,
): Promise<void> {
  const { error } = await client.rpc('answer_message_request', {
    sender_handle: handle,
    should_accept: shouldAccept,
  });
  if (error !== null) throw messagesErrorFrom(error);
}

/**
 * Marks the chat with this person as read up to now.
 *
 * @throws MessagesError
 */
export async function markRead(client: AppSupabaseClient, handle: string): Promise<void> {
  const { error } = await client.rpc('mark_conversation_read', { other_handle: handle });
  if (error !== null) throw messagesErrorFrom(error);
}

/**
 * How many chats have an unread message, for the top bar.
 *
 * @throws MessagesError
 */
export async function fetchUnreadMessageCount(client: AppSupabaseClient): Promise<number> {
  const { data, error } = await client.rpc('unread_message_count');
  if (error !== null) throw messagesErrorFrom(error);
  return data;
}

/** Reads an age group, falling back to the safest reading. */
function ageGroupOf(value: Json | undefined): MyMessageSettings['ageGroup'] {
  if (value === 'adult' || value === 'teen') return value;
  return 'child';
}

/** Reads an audience, falling back to people I follow. */
function audienceOf(value: Json | undefined): MessageAudience {
  if (value === 'everyone' || value === 'nobody') return value;
  return 'people_i_follow';
}

/**
 * The caller's own message setting and age group.
 *
 * @throws MessagesError
 */
export async function fetchMyMessageSettings(
  client: AppSupabaseClient,
): Promise<MyMessageSettings> {
  const { data, error } = await client.rpc('my_message_settings');
  if (error !== null) throw messagesErrorFrom(error);
  const settings: JsonRecord = isRecord(data) ? data : {};
  return {
    audience: audienceOf(settings.audience),
    ageGroup: ageGroupOf(settings.age_group),
    adultsMayMessage: settings.adults_may_message === true,
  };
}
