/**
 * The reported message of a message case, with up to the 20 messages before it, for the case
 * page (story S1-E9-02 criterion 2; board Messages 5.5, "We'll send this message and up to 20
 * messages before it").
 *
 * Who calls it: hooks/useCaseMessage.ts (CaseMessagePanel).
 * What it calls next: admin_case_message() (…_s1_e9_02_block_and_report.sql), which checks the
 * caller may see the case and logs the read as a sensitive read: staff read private messages only
 * through a case about one (architecture 1.8.3).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromCode, ModerationError } from './moderationQueue';

/** One message of the reported chat. */
export interface CaseChatMessage {
  id: string;
  fromHandle: string;
  text: string;
  sentAt: string;
  /** The message the report is about; the others are its context. */
  isReported: boolean;
}

/** The two people in the chat and the messages, oldest first. */
export interface CaseMessages {
  between: string[];
  messages: CaseChatMessage[];
}

/** A JSON object's fields. */
type JsonRecord = Record<string, Json | undefined>;

/** Whether a JSON value is an object (not a list). */
function isRecord(value: Json | undefined): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** A text field, or an empty text. */
function textOf(record: JsonRecord, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

/**
 * One message from the answer's list.
 *
 * @returns the message, or nothing for a malformed entry
 */
function messageFrom(value: Json): CaseChatMessage[] {
  if (!isRecord(value)) return [];
  return [
    {
      id: textOf(value, 'id'),
      fromHandle: textOf(value, 'from_handle'),
      text: textOf(value, 'text'),
      sentAt: textOf(value, 'sent_at'),
      isReported: value.is_reported === true,
    },
  ];
}

/**
 * Reads admin_case_message()'s JSON.
 *
 * @param data - as the database returns it
 * @returns the messages, or null for a case about something else
 */
export function caseMessagesFrom(data: Json): CaseMessages | null {
  if (!isRecord(data)) return null;
  const between = Array.isArray(data.between) ? data.between : [];
  const messages = Array.isArray(data.messages) ? data.messages : [];
  return {
    between: between.filter((handle): handle is string => typeof handle === 'string'),
    messages: messages.flatMap(messageFrom),
  };
}

/**
 * Reads the messages of a message case.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case's ID
 * @returns the messages, or null when the case isn't about a message
 * @throws ModerationError when the caller may not see the case or the database can't be reached
 */
export async function fetchCaseMessages(
  client: AppSupabaseClient,
  caseId: string,
): Promise<CaseMessages | null> {
  const { data, error } = await client.rpc('admin_case_message', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return caseMessagesFrom(data);
}
