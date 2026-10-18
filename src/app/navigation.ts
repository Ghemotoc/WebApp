/**
 * The links in the top bar and the footer (story S1-E1-03).
 *
 * Rule: a link appears only once its page exists, so nobody lands on a page that isn't built yet
 * (docs/board-fixes.md). The boards draw the full top bar (Home, Discover, Library, Forums,
 * Messages) and footer (Help, Community guidelines, Terms, Privacy, Accessibility, Contact us,
 * Report without an account); each story that builds one of those pages adds its link here.
 * Who reads it: TopBar and Footer (src/app/shell/). The /design page shows the full board version.
 */

/** One link: where it goes and the locale key of its text. */
export interface NavigationItem {
  href: string;
  labelKey: string;
}

/**
 * Top bar links that exist today. Coming: Home and Discover (S1-E5-01), Library (S1-E4-03),
 * Forums (S1-E8-01), Messages (S1-E9-01).
 */
export const primaryNavigation: NavigationItem[] = [];

/**
 * Footer links that exist today: the Legal centre's documents (S1-E14-01), in the order of the
 * signed-in board footer, and the contact and company details (S1-E14-02), which stand in for
 * "Contact us" until S1-E14-04 builds it. Coming: Report without an account (S1-E10-02), Help
 * (S1-E11-12), Accessibility (S1-E14-03).
 */
export const footerNavigation: NavigationItem[] = [
  { href: '/legal/guidelines', labelKey: 'nav.guidelines' },
  { href: '/legal/terms', labelKey: 'nav.terms' },
  { href: '/legal/privacy', labelKey: 'nav.privacy' },
  { href: '/legal/contact', labelKey: 'nav.contact' },
];

/** The full top bar from the boards, for the /design page only. */
export const boardPrimaryNavigation: NavigationItem[] = [
  { href: '/design#top-bar', labelKey: 'nav.home' },
  { href: '/design', labelKey: 'nav.discover' },
  { href: '/design#library', labelKey: 'nav.library' },
  { href: '/design#forums', labelKey: 'nav.forums' },
  { href: '/design#messages', labelKey: 'nav.messages' },
];

/** The staff areas from the admin boards, for the /design page until S1-E11-01. */
export const boardStaffNavigation: NavigationItem[] = [
  { href: '/design', labelKey: 'staff.nav.queue' },
  { href: '/design#appeals', labelKey: 'staff.nav.appeals' },
  { href: '/design#users', labelKey: 'staff.nav.users' },
  { href: '/design#stories', labelKey: 'staff.nav.stories' },
  { href: '/design#settings', labelKey: 'staff.nav.settings' },
];
