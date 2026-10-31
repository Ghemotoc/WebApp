/**
 * Reads the March test numbers for the staff Metrics page (story S1-E15-02; board AdminMetrics,
 * screen 8.7).
 *
 * Who calls it: hooks/useMarchNumbers.ts.
 * What it calls next: admin_march_numbers() (…_s1_e15_02_march_metrics.sql), which answers only
 * the owner and admins in a staff session (architecture 1.8.3) with totals counted by the nightly
 * job. Nothing here is about a person and no list of people can be read (decided 17 Oct 2026,
 * 12:34).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One market's writers who have published. */
export interface MarketWriters {
  /** An open market's country code, or "other" for every other country. */
  market: string;
  count: number;
}

/** One day's chapter reads. */
export interface DayReads {
  /** The day, "YYYY-MM-DD", by the Romanian date. */
  day: string;
  reads: number;
}

/** What the page shows. A number is null until the job has counted it. */
export interface MarchNumbers {
  /** The latest day counted, "YYYY-MM-DD", or null before the first nightly count. */
  countedOn: string | null;
  writers: number | null;
  readers: number | null;
  /** The approximate return rate in per cent; null until there is a chapter N to divide by. */
  returnRate: number | null;
  targets: { writers: number; readers: number; returnRate: number };
  writersByMarket: MarketWriters[];
  readsPerDay: DayReads[];
}

/** Why a read failed: not the owner or an admin, or the database couldn't be reached. */
export type MarchNumbersFailure = 'not_allowed' | 'unreachable';

/** The error a failed read throws. */
export class MarchNumbersError extends Error {
  constructor(public readonly failure: MarchNumbersFailure) {
    super(`March numbers read failed: ${failure}`);
  }
}

/** The decided targets, used if a setting is missing (S1-E15-02's legal note). */
const fallbackTargets = { writers: 20, readers: 200, returnRate: 30 };

/**
 * A JSON value as a number. Also used by api/metricsOverview.ts and api/complianceLog.ts.
 *
 * @param value - from the answer
 * @returns the number, or null for anything else
 */
export function numberOrNull(value: Json | undefined): number | null {
  return typeof value === 'number' ? value : null;
}

/**
 * A JSON value as an object. Also used by api/metricsOverview.ts and api/complianceLog.ts.
 *
 * @param value - from the answer
 * @returns the object, or an empty one
 */
export function objectOf(value: Json | undefined): Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}

/**
 * A JSON value as a list of objects. Also used by api/metricsOverview.ts and api/complianceLog.ts.
 *
 * @param value - from the answer
 * @returns the objects, or an empty list
 */
export function listOf(value: Json | undefined): Record<string, Json | undefined>[] {
  return Array.isArray(value) ? value.map((item) => objectOf(item)) : [];
}

/**
 * The answer in the page's words.
 *
 * @param answer - what admin_march_numbers() returned
 * @returns the numbers
 */
export function marchNumbersFromAnswer(answer: Json): MarchNumbers {
  const fields = objectOf(answer);
  const targets = objectOf(fields.targets);
  return {
    countedOn: typeof fields.counted_on === 'string' ? fields.counted_on : null,
    writers: numberOrNull(fields.writers),
    readers: numberOrNull(fields.readers),
    returnRate: numberOrNull(fields.return_rate),
    targets: {
      writers: numberOrNull(targets.writers) ?? fallbackTargets.writers,
      readers: numberOrNull(targets.readers) ?? fallbackTargets.readers,
      returnRate: numberOrNull(targets.return_rate) ?? fallbackTargets.returnRate,
    },
    writersByMarket: listOf(fields.writers_by_market).map((row) => ({
      market: typeof row.market === 'string' ? row.market : 'other',
      count: numberOrNull(row.count) ?? 0,
    })),
    readsPerDay: listOf(fields.reads_per_day).map((row) => ({
      day: typeof row.day === 'string' ? row.day : '',
      reads: numberOrNull(row.reads) ?? 0,
    })),
  };
}

/**
 * Reads the numbers.
 *
 * @param client - the shared Supabase client
 * @returns the numbers
 * Errors: throws MarchNumbersError('not_allowed') for anyone but the owner and admins (42501),
 *   'unreachable' for anything else.
 */
export async function fetchMarchNumbers(client: AppSupabaseClient): Promise<MarchNumbers> {
  const { data, error } = await client.rpc('admin_march_numbers', { days: 30 });
  if (error !== null) {
    throw new MarchNumbersError(error.code === '42501' ? 'not_allowed' : 'unreachable');
  }
  return marchNumbersFromAnswer(data);
}
