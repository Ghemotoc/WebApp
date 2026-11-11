/**
 * The admin site's map: which admin area opens which page (story S1-E11-01; architecture 1.8.2).
 *
 * Who reads it: StaffLayout (the grouped side menu, DASH-1), StaffHomePage (the area cards) and
 * StaffFooter.
 * Where the areas come from: the database's staff_role_areas table (architecture 1.8.3, one row
 * per role and area). The menu shows an area only when BOTH hold: the database says the person's
 * role may use it (my_staff_areas()) AND a page for it exists here. Hiding a menu item is a
 * convenience, never the protection: every staff action is checked again by the server
 * (architecture 1.8.1).
 * Every story that adds a staff page adds its area here, inside its side menu group (DASH-1:
 * Safety, People, Content, Website, System; Robert, 6 Nov 2026, 18:34 UTC).
 */

/**
 * The side menu's groups, in the order they show (bundle DASH-1; Robert picked "Safety, People,
 * Content, Website, System" on 6 Nov 2026, 18:34 UTC). Each page belongs to exactly one.
 */
export const staffMenuGroups = ['safety', 'people', 'content', 'website', 'system'] as const;

/** One of the side menu's groups. */
export type StaffMenuGroup = (typeof staffMenuGroups)[number];

/** One admin area with a page. */
export interface StaffAreaPage {
  /** The area's name in staff_role_areas, for example "audit_log". */
  area: string;
  /** Where the page lives, under /staff. */
  href: string;
  /** The key of the menu text in the "staff" namespace. */
  labelKey: string;
  /** The key of the one-line description on the admin home page, in the "staff" namespace. */
  descriptionKey: string;
  /** The side menu group it sits in (DASH-1). */
  group: StaffMenuGroup;
}

/**
 * The areas that have a page today, in menu order: grouped as the side menu shows them (DASH-1),
 * so the menu, the home page cards and the footer list them the same way.
 */
export const staffAreaPages: StaffAreaPage[] = [
  // Safety: reports, pictures, appeals and the people who answer them.
  // The moderation queue and case pages (S1-E10-03a), first in the menu (architecture 1.8.2).
  {
    area: 'moderation',
    href: '/staff/moderation',
    group: 'safety',
    labelKey: 'nav.moderation',
    descriptionKey: 'home.areas.moderation',
  },
  // Pictures to check (ADMIN-2e1b): pictures that wait for a moderator before anyone sees them.
  {
    area: 'moderation',
    href: '/staff/pictures',
    group: 'safety',
    labelKey: 'nav.pictures',
    descriptionKey: 'home.areas.pictures',
  },
  // Moderator mail (S1-E10-11): the team's shared inbox, for everyone who acts on moderation.
  {
    area: 'moderation',
    href: '/staff/moderator-mail',
    group: 'safety',
    labelKey: 'nav.moderatorMail',
    descriptionKey: 'home.areas.moderator_mail',
  },
  // Appeals against decisions (S1-E10-07), next to the queue (architecture 1.8.2).
  {
    area: 'appeals',
    href: '/staff/appeals',
    group: 'safety',
    labelKey: 'nav.appeals',
    descriptionKey: 'home.areas.appeals',
  },
  // Support, admin and owner keep the safety contacts right; moderators read them (S1-E10-13b).
  {
    area: 'safety_contacts',
    href: '/staff/safety-contacts',
    group: 'safety',
    labelKey: 'nav.safetyContacts',
    descriptionKey: 'home.areas.safety_contacts',
  },
  // Who is on call for removal orders (S1-E10-09), next to the queue those orders land in.
  {
    area: 'on_call_rota',
    href: '/staff/on-call',
    group: 'safety',
    labelKey: 'nav.onCall',
    descriptionKey: 'home.areas.on_call_rota',
  },
  // People: accounts, the waiting list, support tickets, data requests, teacher checks and staff
  // roles.
  // Users (S1-E11-02): look-up and accounts, with Invites (S1-E11-17) as its second tab. Owner
  // and admin, the only roles with the invites area, also hold users, so they reach it there.
  {
    area: 'users',
    href: '/staff/users',
    group: 'people',
    labelKey: 'nav.users',
    descriptionKey: 'home.areas.users',
  },
  // The waiting list (WAITLIST-1): owner and admin let people in, one by one or in waves.
  {
    area: 'waitlist',
    href: '/staff/waitlist',
    group: 'people',
    labelKey: 'nav.waitlist',
    descriptionKey: 'home.areas.waitlist',
  },
  // Support tickets (S1-E11-13; ADMIN-2h1): owner, admin and support, just before Data requests
  // (architecture 1.8.2: "Support tickets, Data requests").
  {
    area: 'support_tickets',
    href: '/staff/support',
    group: 'people',
    labelKey: 'nav.supportTickets',
    descriptionKey: 'home.areas.support_tickets',
  },
  // Data requests (S1-E11-09; ADMIN-2c1): owner, admin and support, after Support tickets
  // (architecture 1.8.2: "Support tickets, Data requests").
  {
    area: 'data_requests',
    href: '/staff/data-requests',
    group: 'people',
    labelKey: 'nav.dataRequests',
    descriptionKey: 'home.areas.data_requests',
  },
  // Schools › Verify teachers (S1-E2-11): owner, admin and moderators with the teacher checks
  // permission; class spaces join it with S1-E8-11.
  {
    area: 'schools',
    href: '/staff/schools/teachers',
    group: 'people',
    labelKey: 'nav.schools',
    descriptionKey: 'home.areas.schools',
  },
  // S1-E2-07a built /staff/roles outside the shell; S1-E11-01 moves it in.
  {
    area: 'roles',
    href: '/staff/roles',
    group: 'people',
    labelKey: 'nav.roles',
    descriptionKey: 'home.areas.roles',
  },
  // Content: stories and what sits around them.
  // Stories (S1-E11-07): every story, for owner, admin, moderator and support (view only).
  {
    area: 'stories',
    href: '/staff/stories',
    group: 'content',
    labelKey: 'nav.stories',
    descriptionKey: 'home.areas.stories',
  },
  // Stories › Featured (S1-E5-10): owner and admin pick Featured this week from the ranking.
  {
    area: 'featured',
    href: '/staff/featured',
    group: 'content',
    labelKey: 'nav.featured',
    descriptionKey: 'home.areas.featured',
  },
  // Stories › Classics (S1-E11-16): owner and admin, beside the Stories list (S1-E11-07).
  {
    area: 'classics',
    href: '/staff/classics',
    group: 'content',
    labelKey: 'nav.classics',
    descriptionKey: 'home.areas.classics',
  },
  // Tags (CMS-1e): new tags writers add wait here for the moderation team (Robert, 30 Oct 2026).
  {
    area: 'moderation',
    href: '/staff/tags',
    group: 'content',
    labelKey: 'nav.tags',
    descriptionKey: 'home.areas.tags',
  },
  // Contests (S1-E11-15; CONTESTS-13b1): owner and admin, with the other content areas.
  {
    area: 'contests',
    href: '/staff/contests',
    group: 'content',
    labelKey: 'nav.contests',
    descriptionKey: 'home.areas.contests',
  },
  // Writers' hub content (GAPS-12c): the prompt of the week, with the contests area's staff.
  {
    area: 'contests',
    href: '/staff/hub',
    group: 'content',
    labelKey: 'nav.hub',
    descriptionKey: 'home.areas.hub',
  },
  // Website: the public pages and the sponsors shown on them.
  // The website CMS: home page, notice banners, help and questions (S1-E11-06, 10, 12), owner
  // and admin only (decided 17 Oct 2026, 19:19); the menu item is "Website" (architecture 1.8.2).
  {
    area: 'website_cms',
    href: '/staff/website',
    group: 'website',
    labelKey: 'nav.website',
    descriptionKey: 'home.areas.website_cms',
  },
  // The page builder (S1-E11-34, CMS-2b): landing pages for contests, campaigns and information.
  // Moderators build them too, so it has its own area and menu item beside Website.
  {
    area: 'landing_pages',
    href: '/staff/landing-pages',
    group: 'website',
    labelKey: 'nav.landingPages',
    descriptionKey: 'home.areas.landing_pages',
  },
  // Sponsors (S1-E12-02; SPONSORS-b2): owner and admin (architecture 1.8.3), beside the website
  // pages their banners show on.
  {
    area: 'sponsors',
    href: '/staff/sponsors',
    group: 'website',
    labelKey: 'nav.sponsors',
    descriptionKey: 'home.areas.sponsors',
  },
  // System: settings, numbers and logs.
  // Content settings, markets and languages (S1-E11-03, S1-E11-05), after the areas staff use
  // every day and before the numbers (architecture 1.8.2).
  {
    area: 'settings',
    href: '/staff/settings',
    group: 'system',
    labelKey: 'nav.settings',
    descriptionKey: 'home.areas.settings',
  },
  // Forum categories, forums and subforums (FORUMS-1a, S1-E8-01): part of Settings in
  // architecture 1.8.2 ("categories, forums"), so the same owner and admins.
  {
    area: 'settings',
    href: '/staff/forums',
    group: 'system',
    labelKey: 'nav.forums',
    descriptionKey: 'home.areas.forums',
  },
  // The March test numbers (S1-E15-02), just before the audit log (architecture 1.8.2).
  {
    area: 'metrics',
    href: '/staff/metrics',
    group: 'system',
    labelKey: 'nav.metrics',
    descriptionKey: 'home.areas.metrics',
  },
  // The app's logs: every call, its failures and the browser's crashes (LOGS-1; Robert, 6 Nov
  // 2026). Owner and admin only, like the audit log after it.
  {
    area: 'call_log',
    href: '/staff/logs',
    group: 'system',
    labelKey: 'nav.logs',
    descriptionKey: 'home.areas.call_log',
  },
  {
    area: 'audit_log',
    href: '/staff/audit-log',
    group: 'system',
    labelKey: 'nav.auditLog',
    descriptionKey: 'home.areas.audit_log',
  },
];

/**
 * Picks the pages a person may open.
 *
 * @param allowedAreas - the areas the database allows the person (my_staff_areas())
 * @returns the pages for those areas, in menu order
 */
export function pagesForAreas(allowedAreas: string[]): StaffAreaPage[] {
  return staffAreaPages.filter((page) => allowedAreas.includes(page.area));
}

/** One side menu group with the pages a person may open in it. */
export interface StaffPageGroup {
  group: StaffMenuGroup;
  pages: StaffAreaPage[];
}

/**
 * Sorts a person's pages into the side menu's groups (DASH-1), leaving out a group with no page.
 *
 * @param pages - the pages the person may open, from pagesForAreas()
 * @returns the groups in menu order (Safety, People, Content, Website, System), each with its
 *   pages in their menu order
 */
export function groupStaffPages(pages: StaffAreaPage[]): StaffPageGroup[] {
  const grouped = staffMenuGroups.map((group) => ({
    group,
    pages: pages.filter((page) => page.group === group),
  }));
  return grouped.filter((entry) => entry.pages.length > 0);
}
