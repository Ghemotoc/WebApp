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
 * Top bar links that exist today: Discover (S1-E5-01), Library (S1-E4-03; a visitor gets a
 * log-in card there) and Forums (FORUMS-1a, S1-E8-01). Coming: Home (S1-E5-08). Messages (S1-E9-01) is only for
 * signed-in people, so it isn't in this list: MessagesNavLink adds it after these, with its count.
 */
export const primaryNavigation: NavigationItem[] = [
  { href: '/discover', labelKey: 'nav.discover' },
  { href: '/library', labelKey: 'nav.library' },
  { href: '/forums', labelKey: 'nav.forums' },
];

/**
 * Footer links that exist today: the Legal centre's documents (S1-E14-01), in the order of the
 * signed-in board footer, and the contact and company details (S1-E14-02), which stand in for
 * "Contact us" until S1-E14-04 builds it, and "Report content", the public report form for anyone
 * (S1-E10-02), and the accessibility statement (S1-E14-03). Coming: Help (S1-E11-12).
 */
export const footerNavigation: NavigationItem[] = [
  // The board's order (Main.dc.html, LOOK-7): Help, the legal texts, Contact us, the community
  // guidelines and Report content. The board's single "Legal" link is Terms and Privacy here,
  // because there is no legal centre page yet (/legal opens the terms).
  // Help: the CMS help pages and questions (S1-E11-12).
  { href: '/help', labelKey: 'nav.help' },
  { href: '/legal/terms', labelKey: 'nav.terms' },
  { href: '/legal/privacy', labelKey: 'nav.privacy' },
  // The one "Contact us": the form (S1-E14-04).
  { href: '/contact', labelKey: 'nav.contactUs' },
  { href: '/legal/guidelines', labelKey: 'nav.guidelines' },
  // Report without an account (S1-E10-02): DSA art. 16 asks for it to be easy to find.
  { href: '/report', labelKey: 'nav.reportContent' },
  // The contact points for authorities and users and the company details, one tap from every page
  // (S1-E14-02; DSA arts. 11 and 12). Named for what it holds, so it isn't a second "Contact".
  { href: '/legal/contact', labelKey: 'nav.contact' },
  // The accessibility statement (S1-E14-03): linked from every page, as statements usually are.
  { href: '/legal/accessibility', labelKey: 'nav.accessibility' },
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
