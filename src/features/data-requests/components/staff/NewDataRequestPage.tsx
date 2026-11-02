/**
 * NewDataRequestPage: /staff/data-requests/new, where support, admin and the owner log a request
 * that reached us by email, by post or in the app (bundle ADMIN-2, part c1; story S1-E11-09
 * criterion 1; screen 8.12).
 *
 * Who shows it: the router, inside StaffLayout; Staff › Data requests links here. What it shows:
 * NewDataRequestForm. The database refuses anyone else when the form is sent. Plain components,
 * no doodles.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';

import { useDataRequestsTranslation } from '../../registerDataRequestsTranslations';

import { NewDataRequestForm } from './NewDataRequestForm';

/**
 * Renders the page.
 *
 * @returns the new data request screen
 */
export function NewDataRequestPage() {
  const { t } = useDataRequestsTranslation();
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('new.documentTitle')}</title>
      <Link to="/staff/data-requests" className="self-start text-link underline">
        {t('new.back')}
      </Link>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('staff.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('new.heading')}</h1>
        <p className="m-0 text-body">{t('new.intro')}</p>
      </div>
      <div className="flex max-w-[720px] flex-col gap-4">
        <NewDataRequestForm />
      </div>
    </PageContainer>
  );
}
