/**
 * Which special greeting, if any, the signed-in person gets today (stories S1-E2-12 and S1-E2-13;
 * Robert, 25 Oct 2026, 07:07 to 07:11).
 *
 * Who calls it: hooks/useMyGreeting.ts. What it calls: my_greeting()
 * (supabase/migrations/…_qa7_01_birthday_month_only.sql), which decides on the Romanian
 * date: the birthday month, then the joining anniversary (from the first
 * one on). The birthday itself never leaves the database here; only the kind of greeting does.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The special greetings, or null for an ordinary day. */
export type GreetingKind = 'birthday_month' | 'anniversary' | null;

/** Today's greeting: its kind and, for the anniversary, how many years since joining. */
export interface MyGreeting {
  kind: GreetingKind;
  years: number;
}

/** The kinds the database may answer; anything else is treated as an ordinary day. */
const knownKinds = ['birthday_month', 'anniversary'] as const;

/**
 * Reads today's greeting for the signed-in person.
 *
 * @param client - the shared Supabase client
 * @returns the kind (null on an ordinary day) and the years since joining
 * @throws Error when the database can't be reached
 */
export async function fetchMyGreeting(client: AppSupabaseClient): Promise<MyGreeting> {
  const { data, error } = await client.rpc('my_greeting');
  if (error !== null) throw new Error(`Could not read the greeting: ${error.message}`);
  // The answer is JSON ({ kind, years }); read it field by field rather than trusting its shape.
  const answer = (data ?? {}) as { kind?: unknown; years?: unknown };
  const kind = knownKinds.find((known) => known === answer.kind) ?? null;
  const years = typeof answer.years === 'number' ? answer.years : 0;
  return { kind, years };
}
