/**
 * Reads and ends the signed-in person's sessions, for Settings › Signed-in devices
 * (story S1-E2-05; decided 17 Oct 2026, 19:43, Q13).
 *
 * Who calls it: hooks/useMySessions.ts (src/features/account/).
 * What it calls next: list_my_sessions() and end_my_session(), which read Supabase's own
 * auth.sessions for the caller only and never return the IP address (…_s1_e2_05_sign_in.sql).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** One signed-in device. */
export interface MySession {
  sessionId: string;
  userAgent: string | null;
  startedAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

/**
 * Lists the signed-in person's devices, most recently active first.
 *
 * @param client - the shared Supabase client
 * @returns the sessions
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function listMySessions(client: AppSupabaseClient): Promise<MySession[]> {
  const { data, error } = await client.rpc('list_my_sessions');
  if (error !== null) throw new Error(`Could not read your devices: ${error.message}`);
  return data.map((session) => ({
    sessionId: session.session_id,
    userAgent: session.user_agent,
    startedAt: session.started_at,
    lastActiveAt: session.last_active_at,
    isCurrent: session.is_current,
  }));
}

/**
 * Logs one of the person's own devices out.
 *
 * @param client - the shared Supabase client
 * @param sessionId - from listMySessions()
 * Errors: throws when the database can't be reached.
 */
export async function endMySession(client: AppSupabaseClient, sessionId: string): Promise<void> {
  const { error } = await client.rpc('end_my_session', { target_session_id: sessionId });
  if (error !== null) throw new Error(`Could not log the device out: ${error.message}`);
}
