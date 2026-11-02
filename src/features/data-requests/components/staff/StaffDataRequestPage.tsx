/**
 * StaffDataRequestPage: /staff/data-requests/:requestId, one data request (bundle ADMIN-2, part
 * c1; story S1-E11-09; screen 8.12): its facts, then, while it is open, the identity check, more
 * time and closing. Building and sending the copy come with part c2.
 *
 * Who shows it: the router, inside StaffLayout; the list links here. The database refuses anyone
 * but owner, admin and support (admin_data_request()), and the page says so.
 * What it calls: useStaffDataRequest → api/dataRequests.ts. Plain components, no doodles.
 */
import { Link, useParams } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';

import type { DataRequest } from '../../api/dataRequests';
import { useStaffDataRequest } from '../../hooks/useStaffDataRequests';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { DataRequestCloseForm } from './DataRequestCloseForm';
import { DataRequestDetails } from './DataRequestDetails';
import { DataRequestExtendForm } from './DataRequestExtendForm';
import { DataRequestIdentityPanel } from './DataRequestIdentityPanel';
import { DataRequestSection } from './DataRequestSection';

/** useStaffDataRequest's result, passed down once. */
type OneRequest = ReturnType<typeof useStaffDataRequest>;

/**
 * The panels for an open request: the identity check, more time and closing.
 *
 * @returns the panels
 */
function OpenRequestActions({ one, request }: { one: OneRequest; request: DataRequest }) {
  return (
    <>
      <DataRequestIdentityPanel
        request={request}
        isActing={one.isActing}
        onAsk={() => void one.act({ kind: 'ask' }).catch(() => undefined)}
      />
      <DataRequestExtendForm
        request={request}
        isActing={one.isActing}
        onExtend={(extraMonths, reason) => one.act({ kind: 'extend', extraMonths, reason })}
      />
      <DataRequestCloseForm
        isActing={one.isActing}
        onClose={(outcome) => one.act({ kind: 'close', outcome })}
      />
    </>
  );
}

/**
 * The request and its panels, or why it can't be shown.
 *
 * @returns the page's body
 */
function RequestBody({ one }: { one: OneRequest }) {
  const { t } = useDataRequestsTranslation();
  if (one.loadFailure === 'not_allowed') {
    return <p className="m-0 text-body">{t('staff.notAllowed')}</p>;
  }
  if (one.loadFailure !== null) {
    return <Notice tone="error">{t(`failures.${one.loadFailure}`)}</Notice>;
  }
  const request = one.request;
  if (request === null) return null;
  return (
    <>
      {request.isUnder16 && <Notice tone="info">{t('page.under16')}</Notice>}
      {one.actionFailure !== null && (
        <Notice tone="error">{t(`failures.${one.actionFailure}`)}</Notice>
      )}
      <DataRequestSection id="data-request-details" heading={t('page.detailsHeading')}>
        <DataRequestDetails request={request} />
      </DataRequestSection>
      {request.isOpen ? (
        <OpenRequestActions one={one} request={request} />
      ) : (
        <p className="m-0 text-body">{t('page.closedNote')}</p>
      )}
    </>
  );
}

/**
 * Renders the page.
 *
 * @returns the data request screen
 */
export function StaffDataRequestPage() {
  const { t } = useDataRequestsTranslation();
  const { requestId = '' } = useParams();
  const one = useStaffDataRequest(requestId);
  const reference = one.request?.reference ?? '';
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('page.documentTitle', { reference })}</title>
      <Link to="/staff/data-requests" className="self-start text-link underline">
        {t('page.back')}
      </Link>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('staff.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('page.heading', { reference })}
        </h1>
      </div>
      <div className="flex max-w-[720px] flex-col gap-5">
        <RequestBody one={one} />
      </div>
    </PageContainer>
  );
}
