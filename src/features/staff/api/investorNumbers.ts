/**
 * Reads the investor numbers for the staff Metrics page (story S1-E15-04, bundle ANALYTICS-1a).
 *
 * Who calls it: hooks/useInvestorNumbers.ts.
 * What it calls next: admin_investor_numbers() (…_s1_e15_04_investor_numbers.sql), which answers
 * only the owner and admins in a staff session (architecture 1.8.3) with totals counted by the
 * nightly job. Nothing here is about a person.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { listOf, MarchNumbersError, numberOrNull, objectOf } from './marchNumbers';

/** The last night's numbers. Each is null until the job has counted it. */
export interface InvestorLatest {
  activeMembers: number | null;
  weeklyActiveMembers: number | null;
  monthlyActiveMembers: number | null;
  /** Rolling retention in per cent: members who came back on that day or later. */
  retentionDay1: number | null;
  retentionDay7: number | null;
  retentionDay30: number | null;
}

/** One month's numbers. */
export interface InvestorMonth {
  /** "YYYY-MM". */
  month: string;
  signUps: number;
  averageDailyActive: number | null;
  monthlyActive: number | null;
  storiesRead: number;
  chapterReads: number;
  chaptersFinished: number;
  /** Chapters finished ÷ chapters opened, in per cent; null with no reads. */
  finishRate: number | null;
  minutesInApp: number;
  minutesReading: number;
  writersPublishing: number;
  retentionDay1: number | null;
  retentionDay7: number | null;
  retentionDay30: number | null;
}

/** One stored number for one day, for the spreadsheet. */
export interface InvestorDayNumber {
  /** "YYYY-MM-DD". */
  day: string;
  metric: string;
  value: number;
}

/** What the section shows. */
export interface InvestorNumbers {
  /** The latest night counted, "YYYY-MM-DD", or null before the first count. */
  countedOn: string | null;
  latest: InvestorLatest;
  /** Oldest first. */
  months: InvestorMonth[];
  days: InvestorDayNumber[];
}

/**
 * One month row in the page's words.
 *
 * @param row - one entry of the answer's months
 * @returns the month
 */
function monthFrom(row: Record<string, Json | undefined>): InvestorMonth {
  return {
    month: typeof row.month === 'string' ? row.month : '',
    signUps: numberOrNull(row.sign_ups) ?? 0,
    averageDailyActive: numberOrNull(row.average_daily_active),
    monthlyActive: numberOrNull(row.monthly_active),
    storiesRead: numberOrNull(row.stories_read) ?? 0,
    chapterReads: numberOrNull(row.chapter_reads) ?? 0,
    chaptersFinished: numberOrNull(row.chapters_finished) ?? 0,
    finishRate: numberOrNull(row.finish_rate),
    minutesInApp: numberOrNull(row.minutes_in_app) ?? 0,
    minutesReading: numberOrNull(row.minutes_reading) ?? 0,
    writersPublishing: numberOrNull(row.writers_publishing) ?? 0,
    retentionDay1: numberOrNull(row.retention_day_1),
    retentionDay7: numberOrNull(row.retention_day_7),
    retentionDay30: numberOrNull(row.retention_day_30),
  };
}

/**
 * The answer in the page's words.
 *
 * @param answer - what admin_investor_numbers() returned
 * @returns the numbers
 */
export function investorNumbersFromAnswer(answer: Json): InvestorNumbers {
  const fields = objectOf(answer);
  const latest = objectOf(fields.latest);
  return {
    countedOn: typeof fields.counted_on === 'string' ? fields.counted_on : null,
    latest: {
      activeMembers: numberOrNull(latest.active_members),
      weeklyActiveMembers: numberOrNull(latest.weekly_active_members),
      monthlyActiveMembers: numberOrNull(latest.monthly_active_members),
      retentionDay1: numberOrNull(latest.retention_day_1),
      retentionDay7: numberOrNull(latest.retention_day_7),
      retentionDay30: numberOrNull(latest.retention_day_30),
    },
    months: listOf(fields.months).map(monthFrom),
    days: listOf(fields.days).map((row) => ({
      day: typeof row.day === 'string' ? row.day : '',
      metric: typeof row.metric === 'string' ? row.metric : '',
      value: numberOrNull(row.value) ?? 0,
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
export async function fetchInvestorNumbers(client: AppSupabaseClient): Promise<InvestorNumbers> {
  const { data, error } = await client.rpc('admin_investor_numbers', { months: 12 });
  if (error !== null) {
    throw new MarchNumbersError(error.code === '42501' ? 'not_allowed' : 'unreachable');
  }
  return investorNumbersFromAnswer(data);
}
