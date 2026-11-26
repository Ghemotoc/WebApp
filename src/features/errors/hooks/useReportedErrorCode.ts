/**
 * useReportedErrorCode: reports the error a page failed with and answers with the code to quote
 * (story S1-E1-05).
 *
 * Who calls it: components/ErrorPage.tsx.
 * What it calls: lib/errorReporter.ts. Drawing the page twice (React's development checks) sends
 * one report, because the reporter answers a repeat with the first report's code.
 */
import { useEffect, useState } from 'react';

import { reportError } from '../lib/errorReporter';

/**
 * Reports the error once and waits for its code.
 *
 * @param thrown - what the page threw
 * @param routePath - the route pattern of the page that failed
 * @param isSkipped - true while the page reloads itself for a newer release (nothing is sent)
 * @returns the error code ("E-4F7A2C"), or null while sending or when nothing was stored
 */
export function useReportedErrorCode(
  thrown: unknown,
  routePath: string,
  isSkipped = false,
): string | null {
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    // A page that reloads itself has nothing to report.
    if (isSkipped) return;
    let isCurrent = true;
    void reportError(thrown, routePath).then((code) => {
      if (isCurrent) setErrorCode(code);
    });
    return () => {
      isCurrent = false;
    };
  }, [thrown, routePath, isSkipped]);

  return errorCode;
}
