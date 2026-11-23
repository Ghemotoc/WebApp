/**
 * The links in the top bar and the footer (story S1-E1-03).
 *
 * Rule: a link appears only once its page exists, so nobody lands on a page that isn't built yet
 * (docs/board-fixes.md). The boards draw the full top bar (Home, Read, Library, Together, then
 * Messages as an icon) and footer (Help, Community guidelines, Terms, Privacy, Accessibility, Contact us,
 * Report without an account); each story that builds one of those pages adds its link here.
 * Who reads it: TopBar and Footer (src/app/shell/). The /design page shows the full board version.
 */

/** One link: where it goes and the locale key of its text. */
export interface NavigationItem {
  href: string;
  labelKey: string;
}

/**
 * The address that stands for "Home" in the list. Home is not one fixed page: it is the Writers'
 * hub when signed in and the public home page when not (useHomeAddress, G9a), so NavTrack swaps
 * this placeholder for the real address when it draws the link.
 */
export const homeNavigationPlaceholder = '#home';

/**
 * Top bar links, in the simplified design's order (bundle CALM-2; the DESIGN handover, Step 2,
 * "Top bar"): Home, Read, Library and Together. Read is the page at /discover (S1-E5-01) and
 * Together the page at /forums (FORUMS-1a, S1-E8-01): only the words changed, the addresses stay
 * (a new address is on hold). Library is S1-E4-03; a visitor gets a log-in card there. Messages
 * (S1-E9-01) is not in the track any more: it is an icon button beside the bell (MessagesHeaderLink).
 */
export const primaryNavigation: NavigationItem[] = [
  { href: homeNavigationPlaceholder, labelKey: 'nav.home' },
  { href: '/discover', labelKey: 'nav.read' },
  { href: '/library', labelKey: 'nav.library' },
  { href: '/forums', labelKey: 'nav.together' },
];

/** One column of footer links: its heading's locale key and its links. */
export interface FooterColumn {
  titleKey: string;
  links: NavigationItem[];
}

/**
 * The footer's three columns, as every page's footer is drawn in the design files (NIGHT-2;
 * Robert, 23 Nov 2026: "the footer hasn't been updated"): Read, Write and talk, Help and legal.
 * The design's "About the apps", "For teachers" and "For partners" wait for their pages.
 * Help and legal keeps every legal link the app had in its single footer row, because each must be
 * one tap from every page: Report content (S1-E10-02; DSA art. 16), the company and legal contacts
 * (S1-E14-02; DSA arts. 11 and 12) and the accessibility statement (S1-E14-03).
 */
export const footerColumns: FooterColumn[] = [
  {
    titleKey: 'shell.footer.read',
    links: [
      { href: '/discover', labelKey: 'shell.footer.trending' },
      { href: '/library', labelKey: 'nav.library' },
      { href: '/search', labelKey: 'shell.footer.search' },
    ],
  },
  {
    titleKey: 'shell.footer.writeAndTalk',
    links: [
      { href: '/write', labelKey: 'shell.footer.startWriting' },
      { href: '/write/new', labelKey: 'shell.footer.firstStory' },
      { href: '/forums', labelKey: 'nav.together' },
    ],
  },
  {
    titleKey: 'shell.footer.helpAndLegal',
    links: [
      // Help: the CMS help pages and questions (S1-E11-12).
      { href: '/help', labelKey: 'nav.help' },
      { href: '/legal/terms', labelKey: 'nav.terms' },
      { href: '/legal/privacy', labelKey: 'nav.privacy' },
      { href: '/legal/guidelines', labelKey: 'nav.guidelines' },
      // The one "Contact us": the form (S1-E14-04).
      { href: '/contact', labelKey: 'nav.contactUs' },
      { href: '/report', labelKey: 'nav.reportContent' },
      { href: '/legal/contact', labelKey: 'nav.contact' },
      { href: '/legal/accessibility', labelKey: 'nav.accessibility' },
    ],
  },
];

/** The full top bar from the boards, for the /design page only. */
export const boardPrimaryNavigation: NavigationItem[] = [
  { href: '/design#top-bar', labelKey: 'nav.home' },
  { href: '/design', labelKey: 'nav.read' },
  { href: '/design#library', labelKey: 'nav.library' },
  { href: '/design#forums', labelKey: 'nav.together' },
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
