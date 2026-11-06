/**
 * AccountNotices: the notices at the top of every page that ask a signed-in person to finish
 * something about their account, in the order they matter (split out of AppLayout in MARKETS-1,
 * which added the country question, to keep AppLayout short).
 *
 * Who uses it: AppLayout, at the top of <main>, inside the maintenance and closing-account gates.
 * What it shows: each notice decides for itself whether it applies, and shows nothing otherwise.
 */
import { CountryQuestionNotice } from '@/features/account/components/CountryQuestionNotice';
import { SanctionNotice } from '@/features/account/components/SanctionNotice';
import { SetupProfileNotice } from '@/features/account/components/SetupProfileNotice';
import { AgeCheckNotice } from '@/features/age-check/components/AgeCheckNotice';
import { LegalUpdateNotice } from '@/features/legal/components/LegalUpdateNotice';
import { ParentConsentNotice } from '@/features/parent-consent/components/ParentConsentNotice';

/**
 * Renders the account notices that apply, one under the other.
 *
 * @returns the notices
 */
export function AccountNotices() {
  return (
    <>
      {/* "We've updated our Terms", for a signed-in person who must accept before posting (S1-E14-01). */}
      <LegalUpdateNotice />
      {/* "Which country do you live in?", asked once of a member who never said (MARKETS-1). */}
      <CountryQuestionNotice />
      {/* "Choose a username", for a signed-in person who hasn't chosen one yet (S1-E2-04). */}
      <SetupProfileNotice />
      {/* "Confirm your age", for an account that waits for an age check (S1-E2-08). */}
      <AgeCheckNotice />
      {/* "Ask a parent or guardian", for an under-16 who waits for consent (S1-E2-03). */}
      <ParentConsentNotice />
      {/* A live suspension or reporting pause, said plainly on every page (S1-E10-06). */}
      <SanctionNotice />
    </>
  );
}
