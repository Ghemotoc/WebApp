/**
 * DeleteAccountConfirm: the second Delete account panel, after "Delete my account" (story
 * S1-E13-03; board Settings 6.3, "Delete your account?").
 *
 * Top to bottom as on the board: the question, when the account is deleted for good, what
 * happens (content deleted, only what an open legal case holds is kept, moderation records stay),
 * "Download my data first", "Download your stories first" for a writer (DownloadStoriesFirst,
 * IDEAS-2a: the files are made without leaving this panel), "Log in again to confirm"
 * (ConfirmLogIn) while the last log-in is too old, then "Keep my account" and "Delete my account".
 * Who shows it: DeleteAccountSection. What it calls: useRequestAccountDeletion and
 * DownloadStoriesFirst (features/data-export); after a request
 * the whole app reads its state again and AccountClosingGate shows the closing page.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { DownloadStoriesFirst } from '@/features/data-export/components/DownloadStoriesFirst';
import { formatRomaniaDate } from '@/lib/romania-time';

import { useRequestAccountDeletion } from '../hooks/useAccountDeletion';
import { useAccountDeletionTranslation } from '../registerAccountDeletionTranslations';

import { ConfirmLogIn } from './ConfirmLogIn';

/** What happens, in the board's order (forum posts and certificates join with their stories). */
const consequences = ['content', 'legalCase', 'records'] as const;

/** What the panel needs. */
interface DeleteAccountConfirmProps {
  /** Days until the account is deleted for good (account_deletion_days). */
  deletionDays: number;
  /** True when the last log-in is recent enough to confirm. */
  signedInRecently: boolean;
  /** "Keep my account": closes this panel. */
  onKeep: () => void;
}

/**
 * The message after a refused or failed request, as a key under confirm.failures.
 *
 * @param mutation - useRequestAccountDeletion's result
 * @returns the key, or null when there is nothing to say
 */
function requestFailureKey(mutation: ReturnType<typeof useRequestAccountDeletion>): string | null {
  if (mutation.isError) return 'deleteFailed';
  if (mutation.data?.outcome === 'sign_in_again') return 'signInAgain';
  if (mutation.data?.outcome === 'staff_account') return 'staffAccount';
  return null;
}

/**
 * Renders the panel.
 *
 * @returns the confirmation
 */
export function DeleteAccountConfirm({
  deletionDays,
  signedInRecently,
  onKeep,
}: DeleteAccountConfirmProps) {
  const { t, i18n } = useAccountDeletionTranslation();
  const request = useRequestAccountDeletion();
  // The time the panel opened, read once, so the date doesn't move while it is on screen.
  const [openedAt] = useState(() => Date.now());
  const deletedOn = new Date(openedAt + deletionDays * 24 * 60 * 60 * 1000);
  // A refusal for an old log-in reads the state again (the hook does), which brings the ways to
  // log in back; its message stays only until the person has logged in again.
  const mustLogInAgain = !signedInRecently;
  const failureKey = requestFailureKey(request);
  const showsFailure = failureKey !== null && (failureKey !== 'signInAgain' || mustLogInAgain);
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-paper p-5">
      <h3 className="m-0 font-heading text-[20px] font-bold text-heading">
        {t('confirm.heading')}
      </h3>
      <p className="m-0 text-body">
        {t('confirm.body', { date: formatRomaniaDate(deletedOn, i18n.language) })}
      </p>
      <div className="flex flex-col gap-2">
        <Eyebrow>{t('confirm.consequencesLabel')}</Eyebrow>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[15px] text-body">
          {consequences.map((part) => (
            <li key={part}>{t(`confirm.consequences.${part}`)}</li>
          ))}
        </ul>
      </div>
      <a href="#download-my-data" className="w-fit font-semibold text-link underline">
        {t('confirm.downloadFirst')}
      </a>
      {/* A writer can save every story here first and come back to this same step (IDEAS-2a). */}
      <DownloadStoriesFirst />
      {mustLogInAgain ? <ConfirmLogIn /> : <Notice tone="success">{t('confirm.confirmed')}</Notice>}
      {showsFailure && <Notice tone="error">{t(`confirm.failures.${failureKey}`)}</Notice>}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onKeep}>
          {t('confirm.keep')}
        </Button>
        {!mustLogInAgain && (
          <Button
            variant="destructive"
            disabled={request.isPending}
            onClick={() => request.mutate()}
          >
            {t('confirm.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}
