/**
 * StaffClassPointsPage: /staff/schools/points, class points flags for our moderation team (bundle
 * CLASS-POINTS, part 1; story S1-E8-16).
 *
 * What it shows: the Schools tabs and every open flag (StaffFlagCard): a teacher's "Report points
 * as suspicious", or the weekly job's quiet flag about two pupils who swap points. The teacher
 * never sees these or who gave points; only this page does (Robert, 13 Nov 2026, decision 8).
 * Who shows it: the router, inside StaffLayout. The database lets in only staff with the
 * Moderation area, and the page says so to anyone else. What it calls: useClassPointFlags →
 * admin_class_point_flags(). Plain components, no doodles.
 */
import { useTranslation } from 'react-i18next';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { SchoolsTabs } from '@/features/staff/components/schools/SchoolsTabs';

import { classPointsStaffFailureOf, useClassPointFlags } from '../../hooks/useClassPointsStaff';
import { useClassPointsTranslation } from '../../registerClassPointsTranslations';

import { StaffFlagCard } from './StaffFlagCard';

/**
 * What goes under the tabs: a refusal, an error, "No open flags" or the flags.
 *
 * @returns the page's body
 */
function FlagsBody() {
  const { t } = useClassPointsTranslation();
  const read = useClassPointFlags();
  const failure = classPointsStaffFailureOf(read.error);
  if (failure?.failure === 'not_allowed') {
    return <p className="m-0 text-body">{t('staff.failures.not_allowed')}</p>;
  }
  if (failure !== null) return <Notice tone="error">{t('staff.failures.unreachable')}</Notice>;
  if (read.data === undefined) return null;
  if (read.data.length === 0) return <p className="m-0 text-body">{t('staff.empty')}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {read.data.map((flag) => (
        <StaffFlagCard key={flag.id} flag={flag} />
      ))}
    </ul>
  );
}

/**
 * Renders the page.
 *
 * @returns the Class points screen of the admin site
 */
export function StaffClassPointsPage() {
  const { t } = useClassPointsTranslation();
  const staff = useTranslation('staff');
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('staff.title')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{staff.t('schoolsTabs.label')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('staff.title')}</h1>
        <p className="m-0 text-body">{t('staff.intro')}</p>
      </div>
      <SchoolsTabs />
      <div className="flex max-w-[1000px] flex-col gap-6">
        <FlagsBody />
      </div>
    </PageContainer>
  );
}
