/**
 * ManualCheckPanel: "Ask for a manual check" and what happened to it (story S1-E2-08, part 08b;
 * board AgeCheck.dc.html, "Still not working?").
 *
 * Who shows it: AgeCheckPage and AgeCheckReturnPage, after a check that didn't work.
 * What it shows, from my_age_check():
 * - a request still open: a person replies within 5 working days, and the account stays
 *   read-only until then (criterion 7);
 * - a refused request: the reason staff gave;
 * - when one may be asked: the line and the button (request_manual_age_check()).
 * A passed manual check needs nothing here: the page shows the result like any other.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Notice';
import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { myAgeCheckQueryKey, requestManualAgeCheck, type MyAgeCheck } from '../api/ageCheck';

/**
 * The button and its line, for someone who may ask.
 *
 * @returns the ask block
 */
function AskForManualCheck() {
  const { t } = useTranslation('account');
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const ask = useMutation({
    mutationFn: async () => requestManualAgeCheck(await requireClient()),
    // Read the check again, so the panel turns into "A person is checking".
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myAgeCheckQueryKey(userId) }),
  });
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-body">
        <strong className="text-heading">{t('ageCheck.manual.stillNotWorking')}</strong>{' '}
        {t('ageCheck.manual.askLine')}
      </p>
      <Button
        variant="secondary"
        className="self-start"
        disabled={ask.isPending}
        onClick={() => ask.mutate()}
      >
        {t('ageCheck.manual.ask')}
      </Button>
      {ask.isError ? <Notice tone="error">{t('ageCheck.manual.askFailed')}</Notice> : null}
    </div>
  );
}

/**
 * Renders the panel, or nothing when there is nothing to say about a manual check.
 *
 * @param props.check - the person's check
 * @returns the panel
 */
export function ManualCheckPanel({ check }: { check: MyAgeCheck }) {
  const { t } = useTranslation('account');
  const manual = check.manualCheck;
  if (manual?.status === 'open') {
    return (
      <Notice tone="info" title={t('ageCheck.manual.openTitle')}>
        {t('ageCheck.manual.openBody')}
      </Notice>
    );
  }
  if (check.canAskManual) return <AskForManualCheck />;
  if (manual?.status === 'refused') {
    return (
      <Notice tone="warning" title={t('ageCheck.manual.refusedTitle')}>
        {t('ageCheck.manual.refusedBody', { reason: manual.reason ?? '' })}
      </Notice>
    );
  }
  return null;
}
