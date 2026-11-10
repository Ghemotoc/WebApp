/**
 * StaffHubPage: /staff/hub, where staff with the contests area (owner and admin) keep what the
 * Writers' hub shows beyond contests: the prompt of the week (GAPS-12c) and the calls for
 * submissions (GAPS-12d). Every change is in the audit log with the before and after values.
 * Plain components (staff screens).
 *
 * Who shows it: the router, inside StaffLayout; the side menu lists it under Content.
 * What it calls: PromptsSection and CallsSection. The server decides who may: each table's
 * policy shows other staff no rows and the admin functions refuse them (architecture 1.8.1).
 */
import { PageContainer } from '@/components/ui/PageContainer';

import { useHubTranslation } from '../../registerHubTranslations';

import { CallsSection } from './CallsSection';
import { PromptsSection } from './PromptsSection';

/**
 * Renders the page.
 *
 * @returns the screen
 */
export function StaffHubPage() {
  const { t } = useHubTranslation();
  return (
    <PageContainer className="flex flex-col gap-10 pt-12 pb-7">
      <title>{t('hubStaff.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">
          {t('hubStaff.heading')}
        </h1>
        <p className="m-0 text-body">{t('hubStaff.intro')}</p>
      </div>
      <PromptsSection />
      <CallsSection />
    </PageContainer>
  );
}
