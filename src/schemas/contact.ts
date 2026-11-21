/**
 * The Contact us form's contract: what the form sends to /api/contact and what comes back (story
 * S1-E14-04; decided 23 Oct 2026, Q10). Shared by the form (src/features/contact/) and the
 * server (server/contact.ts), so both check the same rules (CLAUDE.md: zod schemas in
 * src/schemas/ shared with the server). The trial's "Report a bug" panel sends through the same
 * contract with the topic 'bug_report' (TRIAL-FEEDBACK, src/features/trial/).
 */
import { z } from 'zod';

import { writtenLanguages } from './interfaceLanguages';

/** What a Contact us message can be about; the topic picks the subject line staff see. */
export const contactTopics = ['question', 'account', 'data_request', 'other'] as const;
export type ContactTopic = (typeof contactTopics)[number];

/**
 * Every topic the server takes: the Contact us topics plus 'bug_report', which only the trial's
 * "Report a bug" panel sends (TRIAL-FEEDBACK; Robert, 21 Nov 2026). The Contact us page lists
 * contactTopics only, so a bug report never shows there as a choice.
 */
export const messageTopics = [...contactTopics, 'bug_report'] as const;
export type MessageTopic = (typeof messageTopics)[number];

/** What a bug report is (board J31: Something broke, Something looks wrong, An idea). */
export const bugReportKinds = ['broke', 'looks_wrong', 'idea'] as const;
export type BugReportKind = (typeof bugReportKinds)[number];

/**
 * What the panel adds to a bug report on its own, so the tester doesn't have to (board J31: "We
 * also send the page address, your browser and your screen size"). The page is the path only:
 * never the query or the hash, which can hold a sign-in link's code.
 */
export const pageContextSchema = z.object({
  pagePath: z.string().trim().min(1).max(500),
  browser: z.string().trim().min(1).max(120),
  screenSize: z.string().trim().min(1).max(60),
});
export type PageContext = z.infer<typeof pageContextSchema>;

/** The message's limits (plain, generous; the reply comes by email). */
export const contactMessageMaxLength = 4000;

/**
 * What the form sends.
 * - email: required when signed out; for a signed-in person the account's email is sent too, as
 *   the reply-to address (Q10e), read from the session in the browser.
 * - handle: the signed-in person's username, so staff can find the account (the story's third
 *   criterion: the username and user ID go with the message, never the year of birth).
 * - website: a honeypot (Q10d): a real person never fills it (it is hidden); a bot does. Any
 *   text is accepted here, so the server can tell a bot apart without refusing it.
 */
export const contactRequestSchema = z
  .object({
    topic: z.enum(messageTopics),
    message: z.string().trim().min(1).max(contactMessageMaxLength),
    email: z.string().trim().email().max(254),
    language: z.enum(writtenLanguages),
    handle: z.string().trim().min(1).max(60).optional(),
    userId: z.string().uuid().optional(),
    website: z.string().max(2000).optional(),
    /** A bug report's kind and page details (TRIAL-FEEDBACK); required with 'bug_report' only. */
    bugKind: z.enum(bugReportKinds).optional(),
    pageContext: pageContextSchema.optional(),
  })
  // A bug report always says what it is and where it happened; no other topic carries either.
  .refine(
    (message) =>
      message.topic === 'bug_report'
        ? message.bugKind !== undefined && message.pageContext !== undefined
        : message.bugKind === undefined && message.pageContext === undefined,
    { message: 'A bug report needs its kind and page; other messages carry neither.' },
  );
export type ContactRequest = z.infer<typeof contactRequestSchema>;

/**
 * The answer: the reference the person quotes. Since S1-E11-13 it is the support ticket's number
 * (#1042); before the ticket secret is set it is the old reference, made by the function and not
 * stored (Q10c).
 */
export const contactResponseSchema = z.object({
  reference: z.string().regex(/^(C-\d{4}-\d{4}|#\d+)$/),
});
export type ContactResponse = z.infer<typeof contactResponseSchema>;
