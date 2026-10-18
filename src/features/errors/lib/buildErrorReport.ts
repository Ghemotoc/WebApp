/**
 * buildErrorReport: turns whatever was thrown into the few fields the error log keeps
 * (story S1-E1-05).
 *
 * Who calls it: lib/errorReporter.ts.
 * What it keeps (and nothing else): the error's name, its scrubbed message, the page's route
 * pattern, the app version and the browser family. Never the user ID, email, IP address, the full
 * address of the page, the stack trace or anything someone wrote (GDPR art. 5(1)(c); acceptance
 * criterion "no email, IP address or user content is included").
 */
import { appVersion } from '@/config/appVersion';

import { browserFamily, type BrowserFamily } from './browserFamily';
import { getCurrentRoutePattern } from './currentRoute';
import { scrubErrorText } from './scrubErrorText';

/** The fields sent to report_client_error(); the names match its parameters. */
export interface ErrorReport {
  errorName: string;
  errorMessage: string;
  routePath: string;
  appVersion: string;
  browserFamily: BrowserFamily;
}

/** Limits that match the table's checks (public.client_errors). */
const maximumNameLength = 100;
const maximumMessageLength = 500;

/**
 * Builds the report for one thrown value.
 *
 * @param thrown - anything: an Error, a string, a rejected promise's reason
 * @param routePath - the page's route pattern; defaults to the page on screen (lib/currentRoute.ts)
 * @returns the report, already scrubbed and trimmed
 */
export function buildErrorReport(
  thrown: unknown,
  routePath: string = getCurrentRoutePattern(),
): ErrorReport {
  // Step 1: find a name and a message, whatever was thrown.
  const { name, message } = describeThrown(thrown);
  // Step 2: scrub both and add where and in which build it happened.
  return {
    errorName: scrubErrorText(name, maximumNameLength) || 'Error',
    errorMessage: scrubErrorText(message, maximumMessageLength),
    routePath,
    appVersion,
    browserFamily: browserFamily(navigator.userAgent),
  };
}

/**
 * Reads a name and a message from a thrown value. The stack trace is left out on purpose: it is
 * long and can hold addresses with codes in them.
 *
 * @param thrown - the thrown value
 * @returns its name and message
 */
function describeThrown(thrown: unknown): { name: string; message: string } {
  if (thrown instanceof Error) return { name: thrown.name, message: thrown.message };
  if (typeof thrown === 'string') return { name: 'Error', message: thrown };
  return { name: 'NonErrorThrown', message: '' };
}
