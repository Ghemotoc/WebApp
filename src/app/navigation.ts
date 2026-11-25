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
  /** Shown only to a signed-in member (TRIAL-WALL: Library and Together leave a visitor's bar). */
  isForMembers?: boolean;
  /** Where the link goes for a signed-in member, when that differs (Home becomes Hub). */
  memberHref?: string;
  /** The link's text for a signed-in member, when that differs. */
  memberLabelKey?: string;
}

/**
 * The links for whoever is looking: a visitor sees every link but those for members (Robert,
 * 23 Nov 2026: "library and together should disappear fully from the navbar when they are signed
 * out"); a member sees every link, each with its member address and text where it has one
 * (Robert, 25 Nov 2026: signed in, Home is renamed Hub and opens the Writers' hub).
 *
 * @param items - the full list
 * @param isSignedIn - whether someone is signed in
 * @returns the member's version of the list, or the visitor's without the members' links
 */
export function linksFor<Item extends NavigationItem>(
  items: readonly Item[],
  isSignedIn: boolean,
): Item[] {
  // Step 1: a visitor never sees the members' links, and keeps each link's own address and text.
  if (!isSignedIn) return items.filter((item) => item.isForMembers !== true);
  // Step 2: a member gets the member address and text wherever a link has them.
  return items.map((item) => ({
    ...item,
    href: item.memberHref ?? item.href,
    labelKey: item.memberLabelKey ?? item.labelKey,
  }));
}

/**
 * The address that stands for "Home" in the list. NavTrack swaps this placeholder for the real
 * address from useHomeAddress (G9a) when it draws the link; since user story 1.1 that is "/" for
 * everyone, where WebsiteHomePage shows the member's Home or the public home page.
 */
export const homeNavigationPlaceholder = '#home';

/**
 * Top bar links, in the simplified design's order (bundle CALM-2; the DESIGN handover, Step 2,
 * "Top bar"): Home, Read, Library and Together. Signed in, Home reads "Hub" and opens the Writers'
 * hub at /hub (Robert, 25 Nov 2026); the logo still opens the member's Home at "/". Read is the page at /discover (S1-E5-01) and
 * Together the page at /forums (FORUMS-1a, S1-E8-01): only the words changed, the addresses stay
 * (a new address is on hold). Library is S1-E4-03. Library and Together show only to members
 * (TRIAL-WALL, Robert, 23 Nov 2026). Messages
 * (S1-E9-01) is not in the track any more: it is an icon button beside the bell (MessagesHeaderLink).
 */
export const primaryNavigation: NavigationItem[] = [
  {
    href: homeNavigationPlaceholder,
    labelKey: 'nav.home',
    memberHref: '/hub',
    memberLabelKey: 'nav.hub',
  },
  { href: '/discover', labelKey: 'nav.read' },
  { href: '/library', labelKey: 'nav.library', isForMembers: true },
  { href: '/forums', labelKey: 'nav.together', isForMembers: true },
];

/** One column of footer links: its heading's locale key and its links. */
export interface FooterColumn {
  titleKey: string;
  links: NavigationItem[];
}

/**
 * The footer's three columns, exactly as every page's footer is drawn in the design files (NIGHT-2;
 * Robert, 23 Nov 2026: "the footer hasn't been updated", then "fix the footer" on his approved
 * canvas comments of 23 Nov 2026): Read, Write and talk (with Join a class), Help and legal.
 * "About the apps" and "For partners" open two landing pages staff write in the page builder
 * (/c/apps and /c/partners, seeded by …_books_footer_apps_partners_pages.sql; Robert, 25 Nov 2026:
 * no widget missing, and editable from the back end). The design's "For teachers" is "Join a
 * class", which opens the class page a teacher's students use.
 * "Legal" opens the Legal centre, whose document row reaches the terms, the privacy notice, the
 * company and legal contacts (S1-E14-02; DSA arts. 11 and 12) and the accessibility statement
 * (S1-E14-03) in one more tap; "Report without an account" is the one report form (S1-E10-02;
 * DSA art. 16).
 */
export const footerColumns: FooterColumn[] = [
  {
    titleKey: 'shell.footer.read',
    links: [
      // The Discover shelves' See all pages (S1-E5-09): Trending and New writers ("rising").
      { href: '/discover/all/popular', labelKey: 'shell.footer.trending' },
      { href: '/discover/all/rising', labelKey: 'shell.footer.newWriters' },
      // A landing page staff edit in Website › Landing pages.
      { href: '/c/apps', labelKey: 'shell.footer.aboutApps' },
    ],
  },
  {
    titleKey: 'shell.footer.writeAndTalk',
    links: [
      { href: '/write', labelKey: 'shell.footer.startWriting' },
      { href: '/write/new', labelKey: 'shell.footer.firstStory' },
      { href: '/forums', labelKey: 'nav.together' },
      // Joining a class with the teacher's code (S1-E8-11).
      { href: '/class', labelKey: 'shell.footer.joinClass' },
      // A landing page staff edit in Website › Landing pages; it ends with a button to Contact us.
      { href: '/c/partners', labelKey: 'shell.footer.forPartners' },
    ],
  },
  {
    titleKey: 'shell.footer.helpAndLegal',
    links: [
      // Help: the CMS help pages and questions (S1-E11-12).
      { href: '/help', labelKey: 'nav.help' },
      { href: '/legal/terms', labelKey: 'shell.footer.legal' },
      { href: '/legal/guidelines', labelKey: 'nav.guidelines' },
      // The accessibility statement stays one click from every page (the European Accessibility
      // Act and WCAG 2.2 conformance statement, S1-E14-03); the 23 Nov canvas footer left it out.
      { href: '/legal/accessibility', labelKey: 'nav.accessibility' },
      // The one "Contact us": the form (S1-E14-04).
      { href: '/contact', labelKey: 'nav.contactUs' },
      { href: '/report', labelKey: 'shell.footer.reportWithoutAccount' },
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
