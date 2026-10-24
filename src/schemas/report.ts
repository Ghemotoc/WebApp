/**
 * What a report holds, checked in the browser before it is sent (story S1-E10-01).
 *
 * Who uses it: the Report dialog (src/features/reporting/) and, later, the public report form
 * (S1-E10-02), which posts through an edge function that checks the same schema.
 * The reasons come from the generated database types, never typed by hand (CLAUDE.md rule 14),
 * so the dialog's list can't drift from the report_reason enum.
 */
import { z } from 'zod';

import { Constants } from '@/lib/database.types';

/** The thirteen reasons (the story's eleven plus the board's two), straight from the database enum. */
export const reportReasons = Constants.public.Enums.report_reason;

/** One reason. */
export type ReportReason = (typeof reportReasons)[number];

/** How much a reporter may write in "Anything else?" (the database checks the same). */
export const reportDetailsMaxLength = 2000;

/** The answers of the Report dialog. */
export const reportSchema = z.object({
  reason: z.enum(reportReasons),
  details: z.string().trim().max(reportDetailsMaxLength),
});

/** The checked answers. */
export type ReportAnswers = z.infer<typeof reportSchema>;

/** What is wrong with the answers, in words the dialog can show, or nothing. */
export type ReportProblem = 'reason_missing' | 'details_too_long' | null;

/**
 * Finds what is wrong with the answers.
 *
 * @param answers - what the dialog holds, reason possibly unset
 * @returns the first problem, or null when the report can be sent
 */
export function findReportProblem(answers: {
  reason: string | null;
  details: string;
}): ReportProblem {
  if (answers.reason === null) return 'reason_missing';
  const result = reportSchema.safeParse(answers);
  if (result.success) return null;
  return 'details_too_long';
}
