/**
 * ClosingAccountPage: what a closing account sees until it is deleted for good or kept (story
 * S1-E13-03; board Settings 6.3: "If you change your mind, log in before then and cancel").
 *
 * It says when the account is deleted for good and offers "Keep account" (everything comes
 * back as it was) and "Log out". Below, the person can still download a copy of their data
 * (GDPR art. 15 and 20; bundle INACTIVE-2): downloading doesn't keep the account. An account
 * that closed because nobody used it for 5 years reads its own first lines, which say so.
 * Nothing else of the app is shown: the account can't write, and its profile, stories and
 * comments are hidden from everyone.
 * Who shows it: AccountClosingGate. What it calls: useCancelAccountDeletion, signOutHere
 * (features/auth) for "Log out", which then goes to the home page, and DownloadMyDataSection
 * (features/data-export), loaded only here so the first load of every other page stays small.
 */
import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { requireClient } from '@/features/account/hooks/useMyNames';
import { signOutHere } from '@/features/auth/api/signIn';
import { formatRomaniaDate } from '@/lib/romania-time';

import type { ClosingReason } from '../api/accountDeletion';
import { useCancelAccountDeletion } from '../hooks/useAccountDeletion';
import { useAccountDeletionTranslation } from '../registerAccountDeletionTranslations';

/** Download my data, fetched when the closing page opens. */
const DownloadMyDataSection = lazy(async () => {
  const { DownloadMyDataSection: Section } =
    await import('@/features/data-export/components/DownloadMyDataSection');
  return { default: Section };
});

/** What the page needs: the day of the final deletion and why the account is closing. */
interface ClosingAccountPageProps {
  /** When the account is deleted for good (ISO time). */
  deleteAfter: string;
  /** 'requested' (the person asked) or 'unused' (nobody used it for 5 years). */
  reason: ClosingReason;
}

/**
 * Renders the page.
 *
 * @returns the closing-account page
 */
export function ClosingAccountPage({ deleteAfter, reason }: ClosingAccountPageProps) {
  const { t, i18n } = useAccountDeletionTranslation();
  const navigate = useNavigate();
  const keep = useCancelAccountDeletion();
  const isUnused = reason === 'unused';
  const date = formatRomaniaDate(new Date(deleteAfter), i18n.language);
  const logOut = async () => {
    await signOutHere(await requireClient());
    void navigate('/');
  };
  return (
    <PageContainer className="flex max-w-[640px] flex-col gap-5 pt-12 pb-7">
      <h1 className="m-0 font-heading text-[32px] font-bold text-heading">
        {t('closing.heading')}
      </h1>
      <p className="m-0 text-body">
        {t(isUnused ? 'closing.unusedBody' : 'closing.body', { date })}
      </p>
      <p className="m-0 text-body">
        {t(isUnused ? 'closing.unusedChoices' : 'closing.changeMind')}
      </p>
      {keep.isError && <Notice tone="error">{t('closing.keepFailed')}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button size="lg" disabled={keep.isPending} onClick={() => keep.mutate()}>
          {t('closing.keep')}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => void logOut()}>
          {t('closing.logOut')}
        </Button>
      </div>
      <Suspense fallback={null}>
        <DownloadMyDataSection hidesStoriesBlock />
      </Suspense>
    </PageContainer>
  );
}
