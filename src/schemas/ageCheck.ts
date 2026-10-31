/**
 * The age check's contract: what /api/age-check/start answers and what our server reads from a
 * finished check (story S1-E2-08, part 08a; ADR 0010). Shared by the screens
 * (src/features/age-check/) and the server (server/age-check.ts), so both check the same rules.
 * Imported with a relative path because Cloudflare's functions build doesn't know the "@/" alias.
 */
import { z } from 'zod';

/** The answer to a start: only Yoti's session ID, our SDK ID and where to send the person. */
export const ageCheckStartResponseSchema = z.object({
  sessionId: z.string().min(1).max(200),
  sdkId: z.string().max(200),
  checkUrl: z.string().url(),
});

/** A checked start answer. */
export type AgeCheckStartResponse = z.infer<typeof ageCheckStartResponseSchema>;

/** Why a start failed, as the screens show it. */
export const ageCheckFailures = ['signed_out', 'not_needed', 'unavailable', 'unreachable'] as const;
export type AgeCheckFailure = (typeof ageCheckFailures)[number];

/** A failed start: one of the reasons above. */
export const ageCheckFailureSchema = z.object({ error: z.enum(ageCheckFailures) });

/** The two ways Yoti's page checks an age; a manual check is a staff decision (S1-E2-08b). */
export const ageCheckMethods = ['facial_estimation', 'id_document'] as const;
export type AgeCheckMethod = (typeof ageCheckMethods)[number];

/** A finished check as our server stores it: passed or failed, and how. */
export const ageCheckResultSchema = z.object({
  outcome: z.enum(['passed', 'failed']),
  method: z.enum(ageCheckMethods),
});

/** A checked result. */
export type AgeCheckResult = z.infer<typeof ageCheckResultSchema>;
