/**
 * OnCallRotaPage: /staff/on-call, who is on call for removal orders now, the shifts ahead, the
 * gaps when nobody is, and (owners and admins) adding and removing shifts (story S1-E10-09;
 * Regulation (EU) 2021/784 art. 3(3); the founding team rotates on call, decided 16 Oct 2026,
 * late evening).
 *
 * The person on call when an order arrives is alerted first; if nobody acknowledges within
 * on_call_escalation_minutes (15), every staff member with the on-call permission is alerted.
 * With nobody on call, it goes to all of them at once. The phone alert itself is still a stub
 * that only logs (docs/mocks.md). Plain staff components, no doodles.
 * Who shows it: the router, inside StaffLayout; the menu shows it to roles with the on_call_rota
 * area. What it calls: useOnCallRota.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import { useOnCallRota } from '../hooks/useOnCallRota';
import { registerModerationTranslations } from '../registerModerationTranslations';

import { AddShiftForm } from './AddShiftForm';
import { OnCallShiftList } from './OnCallShiftList';

/**
 * The page's body: a refusal, an error, or the rota.
 *
 * @returns the body
 */
function RotaBody({ rota }: { rota: ReturnType<typeof useOnCallRota> }) {
  const { t } = useTranslation('moderation');
  if (rota.loadFailure === 'not_allowed')
    return <p className="m-0 text-body">{t('onCall.notAllowed')}</p>;
  if (rota.loadFailure !== null)
    return <Notice tone="error">{t(`failures.${rota.loadFailure}`)}</Notice>;
  if (rota.rota === null) return <p className="m-0 text-meta">{t('onCall.loading')}</p>;
  const rotaData = rota.rota;
  return (
    <>
      <Notice tone={rotaData.onCallNowHandle === null ? 'error' : 'info'}>
        {rotaData.onCallNowHandle === null
          ? t('onCall.nobodyNow')
          : t('onCall.onCallNow', { handle: rotaData.onCallNowHandle })}
      </Notice>
      <OnCallShiftList rotaData={rotaData} rota={rota} />
      {rotaData.canEdit && <AddShiftForm rotaData={rotaData} rota={rota} />}
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the On call screen
 */
export function OnCallRotaPage() {
  const { i18n } = useTranslation();
  registerModerationTranslations(i18n);
  const { t } = useTranslation('moderation');
  const rota = useOnCallRota();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('onCall.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('onCall.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('onCall.heading')}
        </h1>
        <p className="m-0 text-body">{t('onCall.intro')}</p>
      </div>
      <RotaBody rota={rota} />
    </PageContainer>
  );
}
