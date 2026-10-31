/**
 * Reads the extra numbers on the staff Metrics page: sign-ups by age group, age checks and
 * moderation cases by tier (story S1-E11-04; board AdminMetrics, screen 8.7).
 *
 * Who calls it: hooks/useMetricsOverview.ts.
 * What it calls next: admin_metrics_overview() (…_s1_e11_04_metrics_and_compliance_log.sql), which
 * answers only the owner and admins in a staff session (architecture 1.8.3). Totals only: the
 * answer never holds a year of birth or anything about one person.
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { listOf, numberOrNull, objectOf } from './marchNumbers';

/** Sign-ups by age group, counted from the year of birth. */
export interface SignUpsByAge {
  thirteenToFifteen: number;
  sixteenToSeventeen: number;
  eighteenOrOver: number;
  notGiven: number;
  total: number;
}

/** How the age checks ended. */
export interface AgeCheckNumbers {
  passed: number;
  failed: number;
  notFinished: number;
  /** Null until manual checks after a failed result exist (S1-E2-08). */
  appealed: number | null;
}

/** One tier's moderation cases in the counting window. */
export interface TierNumbers {
  tier: Enums<'case_tier'>;
  /** The tier's time limit in hours. */
  hours: number;
  cases: number;
  /** Cases decided, or past their deadline while still open. */
  measured: number;
  /** Cases decided by their deadline. */
  inTime: number;
}

/** What the sections show. */
export interface MetricsOverview {
  signUpsByAge: SignUpsByAge;
  ageChecks: AgeCheckNumbers;
  casesByTier: TierNumbers[];
  /** How many days of cases the tier numbers count. */
  tierWindowDays: number;
}

/** Why a read failed: not the owner or an admin, or the database couldn't be reached. */
export type MetricsOverviewFailure = 'not_allowed' | 'unreachable';

/** The error a failed read throws. */
export class MetricsOverviewError extends Error {
  constructor(public readonly failure: MetricsOverviewFailure) {
    super(`Metrics overview read failed: ${failure}`);
  }
}

/** The tiers the database knows, so an unexpected word never reaches the screen. */
const knownTiers: Enums<'case_tier'>[] = ['one_hour', 'same_day', 'two_days', 'seven_days'];

/**
 * A JSON value as a count.
 *
 * @param value - from the answer
 * @returns the number, or 0
 */
function countOf(value: Json | undefined): number {
  return numberOrNull(value) ?? 0;
}

/**
 * The tier rows in the page's words, leaving out any tier the page doesn't know.
 *
 * @param value - the answer's cases_by_tier list
 * @returns the rows, most urgent first as the database sent them
 */
function tierRowsOf(value: Json | undefined): TierNumbers[] {
  const rows: TierNumbers[] = [];
  for (const row of listOf(value)) {
    const tier = knownTiers.find((known) => known === row.tier);
    if (tier === undefined) continue;
    rows.push({
      tier,
      hours: countOf(row.hours),
      cases: countOf(row.cases),
      measured: countOf(row.measured),
      inTime: countOf(row.in_time),
    });
  }
  return rows;
}

/**
 * The answer in the page's words.
 *
 * @param answer - what admin_metrics_overview() returned
 * @returns the numbers
 */
export function metricsOverviewFromAnswer(answer: Json): MetricsOverview {
  const fields = objectOf(answer);
  const ages = objectOf(fields.sign_ups_by_age);
  const checks = objectOf(fields.age_checks);
  return {
    signUpsByAge: {
      thirteenToFifteen: countOf(ages['13_to_15']),
      sixteenToSeventeen: countOf(ages['16_to_17']),
      eighteenOrOver: countOf(ages['18_plus']),
      notGiven: countOf(ages.not_given),
      total: countOf(ages.total),
    },
    ageChecks: {
      passed: countOf(checks.passed),
      failed: countOf(checks.failed),
      notFinished: countOf(checks.not_finished),
      appealed: numberOrNull(checks.appealed),
    },
    casesByTier: tierRowsOf(fields.cases_by_tier),
    tierWindowDays: numberOrNull(fields.tier_window_days) ?? 30,
  };
}

/**
 * Reads the numbers.
 *
 * @param client - the shared Supabase client
 * @returns the numbers
 * Errors: throws MetricsOverviewError('not_allowed') for anyone but the owner and admins (42501),
 *   'unreachable' for anything else.
 */
export async function fetchMetricsOverview(client: AppSupabaseClient): Promise<MetricsOverview> {
  const { data, error } = await client.rpc('admin_metrics_overview');
  if (error !== null) {
    throw new MetricsOverviewError(error.code === '42501' ? 'not_allowed' : 'unreachable');
  }
  return metricsOverviewFromAnswer(data);
}
