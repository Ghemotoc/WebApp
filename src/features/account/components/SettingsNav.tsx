/**
 * SettingsNav: Settings' side menu, one link per group (bundle PROFILE-1, 6 Nov 2026; the menu
 * of design/boards/Settings.dc.html, "Settings sections").
 *
 * Each item is a real link to the group's address (/settings#privacy), so it works with the
 * keyboard, opens in a new tab and keeps Back working; the open group is marked aria-current.
 * Every item is at least 48 px tall (CLAUDE.md rule 9: 24 px minimum targets). On a narrow screen
 * the menu sits above the open group, as on the board. From a tablet up it sits beside the group
 * and stays in view below the floating top bar (md:sticky, top-28 matching the page's
 * scroll-padding-top), so no link slides under the bar when a group's address scrolls the page
 * (NAV-1 follow-up: WCAG 2.5.8 target size and 2.4.11 focus not obscured).
 * The person's reports and certificates have their own pages, so the menu also links to them
 * ("Reports sent" and "Certificates", the board's last two items). The open group is drawn as on
 * the liquid glass board: a soft tint and bold text, with no bar on its edge (bundle G11b).
 * Who shows it: SettingsPage. What it calls: React Router's Link.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { settingsGroupKeys, type SettingsGroupKey } from '../lib/settingsGroups';

/** The look of the two links to pages outside Settings. */
const pageLinkClassName =
  'flex min-h-12 items-center rounded-2xl px-4 text-[15px] font-medium text-heading no-underline hover:bg-panel';

/** What the menu needs. */
export interface SettingsNavProps {
  open: SettingsGroupKey;
  /** Called when a person picks a group, so the page can move the focus to it. */
  onPick: () => void;
}

/**
 * One group's link: the open one has the board's tint and bold text; "Delete account" is in the
 * destructive red, as on the board.
 *
 * @returns the link
 */
function SettingsNavItem({
  groupKey,
  isOpen,
  onPick,
}: {
  groupKey: SettingsGroupKey;
  isOpen: boolean;
  onPick: () => void;
}) {
  const { t } = useTranslation('account');
  // Step 1: the text colour: red for "Delete account", plum for the open group, ink otherwise.
  let textColour = isOpen ? 'text-primary' : 'text-heading';
  if (groupKey === 'delete-account') textColour = 'text-destructive';
  // Step 2: the open group also gets the tint and bold text.
  const look = isOpen ? 'bg-tint font-bold' : 'font-medium hover:bg-panel';
  return (
    <Link
      to={{ hash: groupKey }}
      aria-current={isOpen ? 'true' : undefined}
      onClick={onPick}
      className={`flex min-h-12 items-center rounded-2xl px-4 text-[15px] no-underline ${look} ${textColour}`}
    >
      {t(`settings.groups.${groupKey}`)}
    </Link>
  );
}

/**
 * Renders the menu.
 *
 * @returns the nav
 */
export function SettingsNav({ open, onPick }: SettingsNavProps) {
  const { t } = useTranslation('account');
  return (
    <nav
      aria-label={t('settings.groupsLabel')}
      // While it stays in view (md:sticky) the list is never taller than the window: in a short
      // window it scrolls inside its own box, so its last links are not stuck under the floating
      // tab bar (under 1024 px: 96 px kept free at the foot) or below the window's edge
      // (WCAG 2.2, 2.4.11; GLASS-4 follow-up, 12 Nov 2026).
      className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5 self-start rounded-card border border-border bg-surface p-2.5 shadow-card md:sticky md:top-28 md:max-h-[calc(100dvh-7rem-96px)] md:max-w-[320px] md:overflow-y-auto lg:max-h-[calc(100dvh-8rem)]"
    >
      {settingsGroupKeys.map((key) => (
        <SettingsNavItem key={key} groupKey={key} isOpen={key === open} onPick={onPick} />
      ))}
      {/* Reports, appeals and certificates live on pages of their own (the board's last two). */}
      <Link to="/my-reports" className={pageLinkClassName}>
        {t('settings.myReportsLink')}
      </Link>
      <Link to="/certificates" className={pageLinkClassName}>
        {t('settings.certificatesLink')}
      </Link>
    </nav>
  );
}
