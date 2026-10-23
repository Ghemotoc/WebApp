/**
 * StaffFooter: the bottom of every admin page (story S1-E11-01).
 *
 * Board values (AdminSettings, AdminUsers): the wordmark with the Staff pill, "An app by …", the
 * staff links, "Every action and sensitive read is logged" and the language drop-down. Links
 * appear only when their page exists (the person's own menu). Plain components, no doodles.
 * Who uses it: StaffLayout.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { InfoPill } from '@/components/ui/InfoPill';
import { PageContainer } from '@/components/ui/PageContainer';
import { brand } from '@/config/brand';
import { LanguageSelect } from '@/features/language/components/LanguageSelect';
import { ThemeSelect } from '@/features/theme/components/ThemeSelect';

import type { StaffAreaPage } from '../staffAreas';

/**
 * Renders the footer.
 *
 * @param props.menuItems - the pages the person may open
 * @returns the footer
 */
export function StaffFooter({ menuItems }: { menuItems: StaffAreaPage[] }) {
  const { t } = useTranslation();
  const { t: tStaff } = useTranslation('staff');
  return (
    <footer className="mt-12 border-t border-border py-7 text-sm text-meta">
      <PageContainer className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-2.5">
            <span className="font-heading text-lg font-extrabold text-heading">
              {brand.productName}
            </span>
            <InfoPill tone="plum">{t('staff.pill')}</InfoPill>
          </span>
          <span>{tStaff('shell.byCompany', { companyName: brand.companyName })}</span>
        </div>
        {menuItems.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0">
            {menuItems.map((page) => (
              <li key={page.href}>
                <Link
                  to={page.href}
                  className="inline-flex min-h-6 items-center text-body underline"
                >
                  {tStaff(page.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="m-0">{t('staff.everyActionLogged')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <ThemeSelect />
            <LanguageSelect id="language-select-staff-footer" isLabelVisible />
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
