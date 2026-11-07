/**
 * StaffDashboardTiles: the numbers at the top of the admin front page (bundle DASH-1; Robert,
 * 6 Nov 2026, 18:32 UTC: "a real dashboard where I can see things at a glance").
 *
 * Who shows it: StaffHomePage. What it calls: useStaffDashboard → staff_dashboard(), which sends
 * only the numbers of the areas the person may open; each tile links to the page that lists them.
 * Something past its deadline, or failing, gets the warning colours and a "!" so it never relies
 * on colour alone (WCAG 2.2, 1.4.1). Plain components, no doodles (CLAUDE.md, Designs).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { DashboardTile } from '../api/staffDashboard';
import { useStaffDashboard } from '../hooks/useStaffDashboard';

/** A tile's classes: the card, with the warning colours when it needs someone today. */
function tileClasses(isWarning: boolean): string {
  const shared =
    'flex min-h-24 flex-col justify-between gap-1 rounded-card border p-4 no-underline shadow-card';
  return isWarning
    ? `${shared} border-(--warning-border) bg-(--warning-bg) text-(--warning-text)`
    : `${shared} border-border bg-surface text-heading hover:bg-tint`;
}

/**
 * Renders one tile: the number, big, over what it counts.
 *
 * @param props.tile - the number and the page it opens
 * @returns the tile's link
 */
function Tile({ tile }: { tile: DashboardTile }) {
  const { t, i18n } = useTranslation('staff');
  return (
    <Link to={tile.href} className={tileClasses(tile.isWarning)}>
      <span className="font-heading text-[32px] leading-none font-bold">
        {tile.count.toLocaleString(i18n.language)}
        {tile.isWarning && <span aria-hidden="true"> !</span>}
      </span>
      <span className="text-sm font-semibold">{t(`dashboard.tiles.${tile.key}`)}</span>
    </Link>
  );
}

/**
 * Renders the "At a glance" section.
 *
 * @returns the tiles, a short note while they load or fail, or nothing for a role with no numbers
 */
export function StaffDashboardTiles() {
  const { t } = useTranslation('staff');
  const { tiles, loadFailed } = useStaffDashboard();

  // Step 1: a role with no counted area (the content editor today) gets no empty section.
  if (tiles !== null && tiles.length === 0) return null;

  return (
    <section aria-labelledby="staff-dashboard-heading" className="flex flex-col gap-3">
      <h2 id="staff-dashboard-heading" className="m-0 font-heading text-2xl font-bold text-heading">
        {t('dashboard.heading')}
      </h2>
      {/* Step 2: say plainly when the numbers are still coming or couldn't come. */}
      {loadFailed && <p className="m-0 text-body">{t('dashboard.loadFailed')}</p>}
      {!loadFailed && tiles === null && (
        <p role="status" className="m-0 text-meta">
          {t('dashboard.loading')}
        </p>
      )}
      {/* Step 3: one tile per number, in the side menu's group order. */}
      {tiles !== null && (
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 xl:grid-cols-4">
          {tiles.map((tile) => (
            <li key={tile.key}>
              <Tile tile={tile} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
