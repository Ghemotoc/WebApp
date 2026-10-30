/**
 * The admin site's map: which admin area opens which page (story S1-E11-01; architecture 1.8.2).
 *
 * Who reads it: StaffLayout (the menu), StaffHomePage (the area cards) and StaffFooter.
 * Where the areas come from: the database's staff_role_areas table (architecture 1.8.3, one row
 * per role and area). The menu shows an area only when BOTH hold: the database says the person's
 * role may use it (my_staff_areas()) AND a page for it exists here. Hiding a menu item is a
 * convenience, never the protection: every staff action is checked again by the server
 * (architecture 1.8.1).
 * Every story that adds a staff page adds its area here, in the order of the admin menu
 * (architecture 1.8.2: Moderation, Appeals, Users, Stories, …, Settings, Metrics, Audit log).
 */

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
}

/** The areas that have a page today, in menu order. */
export const staffAreaPages: StaffAreaPage[] = [
  // The moderation queue and case pages (S1-E10-03a), first in the menu (architecture 1.8.2).
  {
    area: 'moderation',
    href: '/staff/moderation',
    labelKey: 'nav.moderation',
    descriptionKey: 'home.areas.moderation',
  },
  // Moderator mail (S1-E10-11): the team's shared inbox, for everyone who acts on moderation.
  {
    area: 'moderation',
    href: '/staff/moderator-mail',
    labelKey: 'nav.moderatorMail',
    descriptionKey: 'home.areas.moderator_mail',
  },
  // Appeals against decisions (S1-E10-07), next to the queue (architecture 1.8.2).
  {
    area: 'appeals',
    href: '/staff/appeals',
    labelKey: 'nav.appeals',
    descriptionKey: 'home.areas.appeals',
  },
  // Support, admin and owner keep the safety contacts right; moderators read them (S1-E10-13b).
  {
    area: 'safety_contacts',
    href: '/staff/safety-contacts',
    labelKey: 'nav.safetyContacts',
    descriptionKey: 'home.areas.safety_contacts',
  },
  // Who is on call for removal orders (S1-E10-09), next to the queue those orders land in.
  {
    area: 'on_call_rota',
    href: '/staff/on-call',
    labelKey: 'nav.onCall',
    descriptionKey: 'home.areas.on_call_rota',
  },
  // Users (S1-E11-02): look-up and accounts, with Invites (S1-E11-17) as its second tab. Owner
  // and admin, the only roles with the invites area, also hold users, so they reach it there.
  {
    area: 'users',
    href: '/staff/users',
    labelKey: 'nav.users',
    descriptionKey: 'home.areas.users',
  },
  // Stories › Classics (S1-E11-16): owner and admin; the Stories list itself is S1-E11-07.
  {
    area: 'classics',
    href: '/staff/classics',
    labelKey: 'nav.classics',
    descriptionKey: 'home.areas.classics',
  },
  // S1-E2-07a built /staff/roles outside the shell; S1-E11-01 moves it in.
  {
    area: 'roles',
    href: '/staff/roles',
    labelKey: 'nav.roles',
    descriptionKey: 'home.areas.roles',
  },
  // Content settings, markets and languages (S1-E11-03, S1-E11-05), after the areas staff use
  // every day and before the numbers (architecture 1.8.2).
  {
    area: 'settings',
    href: '/staff/settings',
    labelKey: 'nav.settings',
    descriptionKey: 'home.areas.settings',
  },
  // The March test numbers (S1-E15-02), just before the audit log (architecture 1.8.2).
  {
    area: 'metrics',
    href: '/staff/metrics',
    labelKey: 'nav.metrics',
    descriptionKey: 'home.areas.metrics',
  },
  {
    area: 'audit_log',
    href: '/staff/audit-log',
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
