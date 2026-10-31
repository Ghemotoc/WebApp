/**
 * Notification email choices and the one-click unsubscribe (story S1-E7-02; board Settings 6.3).
 *
 * Who calls it: hooks/useEmailSettings.ts (Settings › Notifications) and
 * components/UnsubscribePage.tsx (/unsubscribe).
 * What it calls next: my_notification_email_settings(), set_notification_email() and
 * unsubscribe_from_emails() (…_s1_e7_02_notification_emails.sql). Account, safety and legal
 * emails aren't in the list: they are always sent, and the database refuses to switch them off.
 */
import type { Database } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** How a kind is emailed (the database's email_delivery). */
export type EmailDelivery = Database['public']['Enums']['email_delivery'];

/** The kinds a person can choose for, in the screen's order. */
export type ChoosableEmailKind =
  'comment_reply' | 'new_chapter' | 'comment_on_chapter' | 'new_follower';

/** One row of Settings › Notifications. */
export interface EmailSetting {
  kind: ChoosableEmailKind;
  delivery: EmailDelivery;
}

/**
 * Reads the signed-in person's choices (their own, or the defaults).
 *
 * @param client - the shared Supabase client
 * @returns one row per kind, in the screen's order
 * Errors: throws with Supabase's message when it is refused or the database can't be reached.
 */
export async function fetchEmailSettings(client: AppSupabaseClient): Promise<EmailSetting[]> {
  const { data, error } = await client.rpc('my_notification_email_settings');
  if (error !== null) throw new Error(`Could not read your email choices: ${error.message}`);
  return data as unknown as EmailSetting[];
}

/**
 * Saves how one kind is emailed.
 *
 * @param client - the shared Supabase client
 * @param setting - the kind and the new choice
 * Errors: throws with Supabase's message when it is refused or the database can't be reached.
 */
export async function saveEmailSetting(
  client: AppSupabaseClient,
  setting: EmailSetting,
): Promise<void> {
  const { error } = await client.rpc('set_notification_email', {
    kind: setting.kind,
    delivery: setting.delivery,
  });
  if (error !== null) throw new Error(`Could not save your email choice: ${error.message}`);
}

/**
 * Turns every optional notification email off for the key's owner; works signed out.
 *
 * @param client - the shared Supabase client
 * @param unsubscribeKey - the key from the email's link
 * @returns true when the key was found
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function unsubscribeFromEmails(
  client: AppSupabaseClient,
  unsubscribeKey: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('unsubscribe_from_emails', {
    unsubscribe_key: unsubscribeKey,
  });
  if (error !== null) throw new Error(`Could not unsubscribe: ${error.message}`);
  return data;
}
