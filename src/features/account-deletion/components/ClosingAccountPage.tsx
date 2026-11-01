/**
 * ClosingAccountPage: what a closing account sees on every page until it is deleted for good or
 * kept (story S1-E13-03; board Settings 6.3: "If you change your mind, log in before then and
 * cancel").
 *
 * It says when the account is deleted for good and offers "Keep my account" (everything comes
 * back as it was) and "Log out". Nothing else of the app is shown: the account can't write, and
 * its profile, stories and comments are hidden from everyone.
 * Who shows it: AccountClosingGate. What it calls: useCancelAccountDeletion, and signOutHere
 * (features/auth) for "Log out", which then goes to the home page.
 */
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { requireClient } from '@/features/account/hooks/useMyNames';
import { signOutHere } from '@/features/auth/api/signIn';
import { formatRomaniaDate } from '@/lib/romania-time';

import { useCancelAccountDeletion } from '../hooks/useAccountDeletion';
import { useAccountDeletionTranslation } from '../registerAccountDeletionTranslations';

/**
 * Renders the page.
 *
 * @param props.deleteAfter - when the account is deleted for good (ISO time)
 * @returns the closing-account page
 */
export function ClosingAccountPage({ deleteAfter }: { deleteAfter: string }) {
  const { t, i18n } = useAccountDeletionTranslation();
  const navigate = useNavigate();
  const keep = useCancelAccountDeletion();
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
        {t('closing.body', { date: formatRomaniaDate(new Date(deleteAfter), i18n.language) })}
      </p>
      <p className="m-0 text-body">{t('closing.changeMind')}</p>
      {keep.isError && <Notice tone="error">{t('closing.keepFailed')}</Notice>}
      <div className="flex flex-wrap gap-3">
        <Button size="lg" disabled={keep.isPending} onClick={() => keep.mutate()}>
          {t('closing.keep')}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => void logOut()}>
          {t('closing.logOut')}
        </Button>
      </div>
    </PageContainer>
  );
}
