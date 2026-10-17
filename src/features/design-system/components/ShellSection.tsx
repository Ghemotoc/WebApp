/**
 * ShellSection: the full board top bar and the staff bar on /design (story S1-E1-03).
 * The live top bar above shows only pages that exist; this specimen shows every board link.
 * The real footer is at the bottom of this page.
 * Who uses it: DesignPage. Anchor: /design#top-bar.
 */
import { useTranslation } from 'react-i18next';

import { boardPrimaryNavigation, boardStaffNavigation } from '@/app/navigation';
import { StaffBar } from '@/app/shell/StaffBar';
import { TopBar } from '@/app/shell/TopBar';

import { DesignSection } from './DesignSection';

/**
 * Renders the shell specimens.
 *
 * @returns the section
 */
export function ShellSection() {
  const { t } = useTranslation('design');

  return (
    <DesignSection id="top-bar" title={t('sections.shell')}>
      <p className="m-0 max-w-[720px] text-body">{t('shell.topBarNote')}</p>
      <div className="-mx-[clamp(16px,4vw,64px)]">
        <TopBar
          navigationItems={boardPrimaryNavigation}
          navigationLabel={t('shell.topBarSpecimen')}
        />
      </div>
      <p className="m-0 max-w-[720px] text-body">{t('shell.staffBarNote')}</p>
      <div className="-mx-[clamp(16px,4vw,64px)]">
        <StaffBar
          navigationItems={boardStaffNavigation}
          staffName={t('shell.staffName')}
          roleLabel={t('shell.staffRole')}
          onSignOut={() => undefined}
        />
      </div>
      <p className="m-0 text-[13px] text-meta">{t('common:staff.everyActionLogged')}</p>
    </DesignSection>
  );
}
