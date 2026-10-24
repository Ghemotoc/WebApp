/**
 * What a report holds, checked in the browser before it is sent (story S1-E10-01).
 *
 * Who uses it: the Report dialog (src/features/reporting/) and, later, the public report form
 * (S1-E10-02), which posts through an edge function that checks the same schema.
 * The reasons come from the generated database types, never typed by hand (CLAUDE.md rule 14),
 * so the dialog's list can't drift from the report_reason enum.
 */
import { z } from 'zod';

// A relative path: the public form's server code (server/notice.ts) imports this file too, and
// Cloudflare's functions build doesn't know the "@/" alias.
import { Constants } from '../lib/database.types';

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

/**
 * "Copied from a published work" (S1-E10-08): where the reporter says the text comes from. Every
 * field is optional; even just a title helps (Robert, canvas comment, 16 Oct 2026). The limits
 * are the database's (reports_copy_field_lengths and public_notices_copy_source_lengths).
 */
export const copySourceLimits = {
  title: 300,
  author: 200,
  reference: 2000,
  passage: 4000,
} as const;

/** The source fields as typed. */
export interface CopySource {
  title: string;
  author: string;
  reference: string;
  passage: string;
}

/** An empty source. */
export const emptyCopySource: CopySource = { title: '', author: '', reference: '', passage: '' };

/** The reason whose report carries a source. */
export const copiedWorkReason: ReportReason = 'copied_published_work';

/**
 * The source as the database takes it: trimmed, each field cut to its limit, empty ones left out.
 *
 * @param source - the fields as typed
 * @returns an object with only the given fields (sourceTitle, sourceAuthor, sourceReference,
 *   sourcePassage), possibly empty
 */
export function copySourceForDatabase(source: CopySource): Record<string, string> {
  const fields: Record<string, string> = {};
  const pairs: [keyof CopySource, string][] = [
    ['title', 'sourceTitle'],
    ['author', 'sourceAuthor'],
    ['reference', 'sourceReference'],
    ['passage', 'sourcePassage'],
  ];
  for (const [field, databaseName] of pairs) {
    const value = source[field].trim().slice(0, copySourceLimits[field]);
    if (value !== '') fields[databaseName] = value;
  }
  return fields;
}
