/**
 * StaffHomePage: /staff, the admin site's front page (story S1-E11-01; DASH-1).
 *
 * Who shows it: the router, inside StaffLayout. What it shows: the numbers at a glance for the
 * areas the person may open (StaffDashboardTiles, DASH-1), then one card per area, grouped as the
 * side menu is (Safety, People, Content, Website, System), and a plain note when no area is open
 * to the role (the content editor, decided 17 Oct 2026, 19:19). An ended 12-hour staff session
 * never reaches this page: StaffLayout shows "Your staff session has ended" instead (DASH-1).
 * Owners, and anyone named in picture_open_alert_handles, also see who opened uploaded pictures
 * this week (ADMIN-2e2a). Plain components, no doodles (CLAUDE.md, Designs).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';

import { useMyStaffAccess } from '../hooks/useMyStaffAccess';
import { groupStaffPages, pagesForAreas, type StaffPageGroup } from '../staffAreas';

import { PictureOpeningsPanel } from './PictureOpeningsPanel';
import { StaffDashboardTiles } from './StaffDashboardTiles';

/**
 * Renders one group's area cards under the group's name.
 *
 * @param props.entry - the group and the pages in it the person may open
 * @returns the group's section
 */
function AreaGroup({ entry }: { entry: StaffPageGroup }) {
  const { t } = useTranslation('staff');
  const headingId = `staff-home-group-${entry.group}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="eyebrow m-0">
        {t(`menuGroups.${entry.group}`)}
      </h3>
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {entry.pages.map((page) => (
          <li key={page.href}>
            <Link
              to={page.href}
              className="flex min-h-24 flex-col gap-1 rounded-card border border-border bg-surface p-5 no-underline shadow-card hover:bg-tint"
            >
              <span className="font-heading text-xl font-bold text-heading">
                {t(page.labelKey)}
              </span>
              <span className="text-sm text-meta">{t(page.descriptionKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Renders the page.
 *
 * @returns the admin front page
 */
export function StaffHomePage() {
  const { t } = useTranslation('staff');
  const { access } = useMyStaffAccess();
  const groups = groupStaffPages(pagesForAreas(access.areas.map((area) => area.area)));

  return (
    <PageContainer className="flex flex-col gap-8 pt-8 pb-7 lg:pt-6">
      <title>{t('home.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('shell.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('home.heading')}</h1>
        <p className="m-0 text-body">{t('home.intro')}</p>
      </div>
      <StaffDashboardTiles />
      <PictureOpeningsPanel />
      {groups.length === 0 ? (
        <p className="m-0 max-w-[720px] text-body">{t('home.noAreas')}</p>
      ) : (
        <section aria-labelledby="staff-home-areas" className="flex flex-col gap-5">
          <h2 id="staff-home-areas" className="m-0 font-heading text-2xl font-bold text-heading">
            {t('home.areasHeading')}
          </h2>
          {groups.map((entry) => (
            <AreaGroup key={entry.group} entry={entry} />
          ))}
        </section>
      )}
    </PageContainer>
  );
}
