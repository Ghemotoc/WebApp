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
      <p className="m-0 max-w-[720px] text-ink-muted">{t('shell.topBarNote')}</p>
      <div className="-mx-6 md:-mx-8 lg:-mx-16">
        <TopBar
          navigationItems={boardPrimaryNavigation}
          navigationLabel={t('shell.topBarSpecimen')}
          // One search region per page: the real top bar already has it.
          hasSearch={false}
        />
      </div>
      <p className="m-0 max-w-[720px] text-ink-muted">{t('shell.staffBarNote')}</p>
      <div className="-mx-6 md:-mx-8 lg:-mx-16">
        <StaffBar
          navigationItems={boardStaffNavigation}
          staffName={t('shell.staffName')}
          roleLabel={t('shell.staffRole')}
          onSignOut={() => undefined}
        />
      </div>
      <p className="m-0 type-meta text-ink-muted">{t('common:staff.everyActionLogged')}</p>
    </DesignSection>
  );
}
