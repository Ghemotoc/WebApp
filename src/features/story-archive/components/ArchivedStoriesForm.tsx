/**
 * ArchivedStoriesForm: the two fields and the button of Archived stories (bundle ARCHIVE-1).
 *
 * The person proves the closed account was theirs with its year of birth and one of its pen
 * name, username or a story's title (Robert, 11 Nov 2026, 19:52 UTC); the email address is
 * checked by the database from the logged-in account, never typed here.
 * Who shows it: ArchivedStoriesSection. What it calls: hooks/useStoryArchive.ts.
 */
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { TextInput } from '@/components/ui/TextInput';

import type { ArchiveClaimOutcome } from '../api/storyArchive';
import { useClaimStoryArchive } from '../hooks/useStoryArchive';
import { claimFieldProblems, isClaimLocked } from '../lib/archiveClaimForm';
import { useStoryArchiveTranslation } from '../registerStoryArchiveTranslations';

import { ArchiveClaimResult } from './ArchiveClaimResult';

/** What the form needs. */
export interface ArchivedStoriesFormProps {
  /** True when too many wrong tries were made today: the button is off. */
  lockedAtStart: boolean;
}

/**
 * The line under the fields: the call failed, the form was already locked, or what the last
 * try did.
 *
 * @returns the notice, or nothing before the first try
 */
function ClaimStatus({
  failed,
  lockedAtStart,
  outcome,
}: {
  failed: boolean;
  lockedAtStart: boolean;
  outcome: ArchiveClaimOutcome | undefined;
}) {
  const { t } = useStoryArchiveTranslation();
  if (failed) return <Notice tone="error">{t('failed')}</Notice>;
  if (outcome !== undefined) return <ArchiveClaimResult outcome={outcome} />;
  if (lockedAtStart) return <Notice tone="error">{t('locked')}</Notice>;
  return null;
}

/**
 * Renders the form.
 *
 * @returns the fields, the result of the last try and the button
 */
export function ArchivedStoriesForm({ lockedAtStart }: ArchivedStoriesFormProps) {
  const { t } = useStoryArchiveTranslation();
  const claim = useClaimStoryArchive();
  const [birthYear, setBirthYear] = useState('');
  const [knownName, setKnownName] = useState('');
  const [wasSubmitted, setWasSubmitted] = useState(false);

  // What is wrong with each field, shown only after the first press of the button.
  const problems = claimFieldProblems(birthYear, knownName);
  const outcome = claim.data;
  const isLocked = isClaimLocked(lockedAtStart, outcome);
  const shownProblems = wasSubmitted ? problems : { year: undefined, name: undefined };

  /** Checks the two fields, then asks the database. */
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setWasSubmitted(true);
    if (problems.year !== undefined || problems.name !== undefined) return;
    claim.mutate({ birthYear: Number(birthYear.trim()), knownName: knownName.trim() });
  }

  return (
    <form noValidate className="flex flex-col gap-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
        <TextInput
          id="archived-stories-birth-year"
          label={t('birthYear')}
          hint={t('birthYearHint')}
          inputMode="numeric"
          autoComplete="bday-year"
          maxLength={4}
          value={birthYear}
          errorMessage={shownProblems.year && t(shownProblems.year)}
          onChange={(event) => setBirthYear(event.target.value)}
        />
        <TextInput
          id="archived-stories-known-name"
          label={t('knownName')}
          hint={t('knownNameHint')}
          autoComplete="off"
          maxLength={120}
          value={knownName}
          errorMessage={shownProblems.name && t(shownProblems.name)}
          onChange={(event) => setKnownName(event.target.value)}
        />
      </div>
      <ClaimStatus failed={claim.isError} lockedAtStart={lockedAtStart} outcome={outcome} />
      {outcome?.outcome !== 'restored' && (
        <div>
          <Button type="submit" variant="secondary" disabled={claim.isPending || isLocked}>
            {claim.isPending ? t('working') : t('submit')}
          </Button>
        </div>
      )}
    </form>
  );
}
