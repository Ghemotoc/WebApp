/**
 * ChangeOutcome: the line under a Sponsors action saying it worked, or why it didn't (story
 * S1-E12-02; bundle SPONSORS-b2).
 *
 * Who shows it: every section of Staff › Sponsors, under its own buttons. What it calls:
 * lib/sponsorWords.ts for the error's words. A failed save of an incomplete campaign also lists
 * what to fix; a refused booking names the booking already in the slot (part e2).
 */
import { Notice } from '@/components/ui/Notice';

import type { SponsorError } from '../../api/sponsors';
import { errorKeyOf, problemKeyOf } from '../../lib/sponsorWords';
import { useSponsorTranslation } from '../../registerSponsorTranslations';

/** What the line needs. */
interface ChangeOutcomeProps {
  /** The words to show after a success, or null to show nothing then. */
  successText: string | null;
  isDone: boolean;
  failure: SponsorError | null;
}

/**
 * Renders the outcome.
 *
 * @returns a success or error notice, or nothing
 */
export function ChangeOutcome({ successText, isDone, failure }: ChangeOutcomeProps) {
  const { t } = useSponsorTranslation();
  if (failure !== null) {
    return (
      <Notice tone="error">
        {t(errorKeyOf(failure), { clash: failure.clashWith ?? '' })}
        {failure.problems.length > 0 && (
          <ul className="mt-2 mb-0 pl-5">
            {failure.problems.map((code) => (
              <li key={code}>{t(problemKeyOf(code), { code })}</li>
            ))}
          </ul>
        )}
      </Notice>
    );
  }
  if (isDone && successText !== null) return <Notice tone="success">{successText}</Notice>;
  return null;
}
