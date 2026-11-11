/**
 * LandingPagesAdminPage: /staff/landing-pages, the page builder's own place in the admin menu
 * (story S1-E11-34; bundle CMS-2b).
 *
 * Moderators, admins, the owner and anyone whose custom role holds Landing pages build contest,
 * campaign and information pages here without the rest of the Website area. The same editor
 * stays as a tab under Website for owners and admins. A person without the area sees why and no
 * editor; the database refuses their changes anyway (require_landing_page_staff()).
 * Who shows it: the router, inside StaffLayout. What it calls: LandingPagesTab and
 * useMyStaffAccess.
 */
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Notice } from '@/components/ui/Notice';
import { PageContainer } from '@/components/ui/PageContainer';
import { useMyStaffAccess } from '@/features/staff/hooks/useMyStaffAccess';

import { useLandingPageTranslation } from '../../registerLandingPageTranslations';

import { LandingPagesTab } from './LandingPagesTab';

/**
 * Renders the page.
 *
 * @returns the Landing pages screen
 */
export function LandingPagesAdminPage() {
  const { t } = useLandingPageTranslation();
  const { access, isKnown } = useMyStaffAccess();
  // Step 1: building pages needs Change in the landing_pages area (architecture 1.8.3).
  const mayEdit = access.areas.some(
    (allowed) => allowed.area === 'landing_pages' && allowed.access === 'act',
  );
  // Step 2: the heading, then the editor or the reason there is none.
  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-10">
      <title>{t('adminPage.documentTitle')}</title>
      <div className="flex max-w-[760px] flex-col gap-2">
        <Eyebrow>{t('adminPage.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('adminPage.heading')}
        </h1>
      </div>
      {isKnown && !mayEdit && <Notice tone="error">{t('adminPage.notAllowed')}</Notice>}
      {isKnown && mayEdit && <LandingPagesTab />}
    </PageContainer>
  );
}
