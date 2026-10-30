/**
 * StaffHomePage: /staff, the admin site's front page (story S1-E11-01).
 *
 * Who shows it: the router, inside StaffLayout. What it shows: one card per area the person may
 * open today (the same list as the menu), and a plain note when none is open to them: a role
 * with no area yet (the content editor, decided 17 Oct 2026, 19:19) or a staff session older than
 * 12 hours (the database ends it; signing in again starts a new one).
 * Plain components, no doodles (CLAUDE.md, Designs).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { PageContainer } from '@/components/ui/PageContainer';

import { useMyStaffAccess } from '../hooks/useMyStaffAccess';
import { pagesForAreas } from '../staffAreas';

/**
 * Renders the page.
 *
 * @returns the admin front page
 */
export function StaffHomePage() {
  const { t } = useTranslation('staff');
  const { access } = useMyStaffAccess();
  const pages = pagesForAreas(access.areas.map((area) => area.area));

  return (
    <PageContainer className="flex flex-col gap-6 pt-12 pb-7">
      <title>{t('home.documentTitle')}</title>
      <div className="flex max-w-[720px] flex-col gap-2">
        <Eyebrow>{t('shell.eyebrow')}</Eyebrow>
        <h1 className="m-0 font-heading text-[34px] font-bold text-heading">{t('home.heading')}</h1>
        <p className="m-0 text-body">{t('home.intro')}</p>
      </div>
      {pages.length === 0 ? (
        <p className="m-0 max-w-[720px] text-body">{t('home.noAreas')}</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
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
      )}
      <p className="m-0 max-w-[720px] text-sm text-meta">{t('home.comingAreas')}</p>
    </PageContainer>
  );
}
