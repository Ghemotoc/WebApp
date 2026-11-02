/**
 * StaffDataRequestsPage: /staff/data-requests, every request to see, move, correct or delete
 * someone's data, nearest deadline first (bundle ADMIN-2, part c1; story S1-E11-09; screen 8.12;
 * architecture 1.8.2 "Data requests").
 *
 * Who shows it: the router, inside StaffLayout; the menu shows it to owner, admin and support.
 * The database refuses everyone else (admin_data_requests()), and the page says so.
 * What it calls: useStaffDataRequests → api/dataRequests.ts. Plain components, no doodles.
 */
import { useState } from 'react';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { Select } from '@/components/ui/Select';

import { useStaffDataRequests } from '../../hooks/useStaffDataRequests';
import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { DataRequestList } from './DataRequestList';

/** useStaffDataRequests's result, passed down once. */
type RequestList = ReturnType<typeof useStaffDataRequests>;

/**
 * What goes under the filter: a refusal, an error, nothing to show, or the list.
 *
 * @returns the page's body
 */
function RequestsBody({ list }: { list: RequestList }) {
  const { t } = useDataRequestsTranslation();
  if (list.loadFailure === 'not_allowed') {
    return <p className="m-0 text-body">{t('staff.notAllowed')}</p>;
  }
  if (list.loadFailure !== null) {
    return <Notice tone="error">{t(`failures.${list.loadFailure}`)}</Notice>;
  }
  if (list.isLoading) return null;
  if (list.requests.length === 0) return <p className="m-0 text-body">{t('staff.none')}</p>;
  return <DataRequestList requests={list.requests} />;
}

/**
 * Renders the page.
 *
 * @returns the Data requests screen
 */
export function StaffDataRequestsPage() {
  const { t } = useDataRequestsTranslation();
  const [shown, setShown] = useState<'open' | 'all'>('open');
  const list = useStaffDataRequests(shown === 'open');
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('staff.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('staff.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('staff.heading')}
        </h1>
        <p className="m-0 text-body">{t('staff.intro')}</p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Select
          id="data-requests-shown"
          label={t('staff.show')}
          isLabelVisible
          placement="form"
          value={shown}
          onChange={(value) => setShown(value === 'all' ? 'all' : 'open')}
          options={[
            { value: 'open', label: t('staff.showOpen') },
            { value: 'all', label: t('staff.showAll') },
          ]}
        />
        {list.loadFailure !== 'not_allowed' && (
          <Link
            to="/staff/data-requests/new"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:opacity-90"
          >
            {t('staff.logRequest')}
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <RequestsBody list={list} />
      </div>
    </PageContainer>
  );
}
