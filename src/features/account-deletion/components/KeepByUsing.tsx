/**
 * KeepByUsing: keeps an account that closed for not being used, the moment its owner opens an
 * ordinary page again (bundle INACTIVE-2; Robert, 11 Nov 2026, 19:43 UTC: someone who only
 * downloads their data is still deleted, someone who goes on to use the site is kept).
 *
 * It asks the database once to keep the account ("Keep account" without the button), and shows a
 * short line while that runs. When it worked, every cached answer is read again, the account
 * reads as open and AccountClosingGate shows the page the person asked for. When it failed, it
 * says so with a button to try again, so nobody is left on an empty page.
 * Who shows it: AccountClosingGate. What it calls: useCancelAccountDeletion.
 */
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useCancelAccountDeletion } from '../hooks/useAccountDeletion';
import { useAccountDeletionTranslation } from '../registerAccountDeletionTranslations';

/**
 * Renders the "opening the account again" line, or the failure with "Keep account".
 *
 * @returns the short page shown while the account is kept
 */
export function KeepByUsing() {
  const { t } = useAccountDeletionTranslation();
  const keep = useCancelAccountDeletion();
  // A ref, not state: React may run the effect twice in development, and the account is kept once.
  const hasAsked = useRef(false);
  const { mutate } = keep;
  useEffect(() => {
    if (hasAsked.current) return;
    hasAsked.current = true;
    mutate();
  }, [mutate]);
  return (
    <PageContainer className="flex max-w-[640px] flex-col gap-5 pt-12 pb-7">
      {keep.isError ? (
        <>
          <Notice tone="error">{t('closing.keepFailed')}</Notice>
          <div>
            <Button size="lg" onClick={() => mutate()}>
              {t('closing.keep')}
            </Button>
          </div>
        </>
      ) : (
        <p role="status" className="m-0 text-body">
          {t('closing.keeping')}
        </p>
      )}
    </PageContainer>
  );
}
