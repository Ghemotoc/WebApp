/**
 * The list of pages and their addresses (stories S1-E1-01 and S1-E1-03).
 *
 * Who uses it: src/main.tsx hands `appRoutes` to React Router's RouterProvider.
 * What it shows: every public page sits inside AppLayout (top bar, page, footer); each route
 * points to one page component inside src/features/<feature>/.
 * Every new screen adds its route here, and a line to docs/code-tour.md.
 */
import type { ComponentType } from 'react';
import { Navigate, type RouteObject } from 'react-router';

import { ErrorPage } from '@/features/errors/components/ErrorPage';
import { prefetchChapter } from '@/features/reading/api/chapterPrefetch';
import { ACCOUNT_CLOSING_PATH } from '@/lib/account-closing-path';

import { AppLayout } from './shell/AppLayout';
import { NotFoundPage } from './shell/NotFoundPage';

/**
 * A page that is loaded only when someone opens it (QA-6, finding S4: the home page, help, landing pages, the
 * Legal centre, sign-up, log-in and set-up used to be in the first download of every page, the
 * chapter reader's included).
 *
 * @param path - the page's address
 * @param loadPage - imports the page's module and returns its component
 * @returns the route; nothing is shown for the moment the code downloads on a first visit
 */
function lazyPage(path: string, loadPage: () => Promise<ComponentType>): RouteObject {
  return {
    path,
    HydrateFallback: () => null,
    lazy: async () => ({ Component: await loadPage() }),
  };
}

/**
 * Whether this build includes the /design components page: always in development, and on staging
 * when VITE_SHOW_DESIGN_PAGE is "true". Never in production (decided 17 Oct 2026). Vite replaces
 * these values at build time, so a production build drops the page's code entirely.
 */
export const isDesignPageIncluded =
  import.meta.env.DEV || import.meta.env.VITE_SHOW_DESIGN_PAGE === 'true';

/** The /design route, loaded only when someone opens it. */
const designRoute: RouteObject = {
  path: '/design',
  // Shown for the moment the page's code is loading when /design is the first page opened.
  HydrateFallback: () => null,
  lazy: async () => {
    const { DesignPage } = await import('@/features/design-system/DesignPage');
    return { Component: DesignPage };
  },
};

/**
 * The admin site, /staff and everything under it (S1-E11-01; architecture 1.8.1): one frame
 * (StaffLayout, with the staff bar and the areas the database allows the person) around each
 * staff page. Every part is loaded only when someone opens it, so staff code never ships in the
 * reader's bundle. Each story that adds a staff page adds its child route here and its area to
 * src/features/staff/staffAreas.ts.
 */
const staffRoutes: RouteObject = {
  path: '/staff',
  HydrateFallback: () => null,
  // A staff page that fails shows the same error page as the public ones (S1-E1-05).
  errorElement: <ErrorPage />,
  lazy: async () => {
    const { StaffLayout } = await import('@/features/staff/components/StaffLayout');
    return { Component: StaffLayout };
  },
  children: [
    {
      index: true,
      lazy: async () => {
        const { StaffHomePage } = await import('@/features/staff/components/StaffHomePage');
        return { Component: StaffHomePage };
      },
    },
    // The moderation queue and one case (S1-E10-03a; Lane C).
    {
      path: 'moderation',
      lazy: async () => {
        const { ModerationQueuePage } =
          await import('@/features/moderation/components/ModerationQueuePage');
        return { Component: ModerationQueuePage };
      },
    },
    {
      path: 'moderation/cases/:caseId',
      lazy: async () => {
        const { CasePage } = await import('@/features/moderation/components/CasePage');
        return { Component: CasePage };
      },
    },
    // Moderator mail (S1-E10-11): the team's shared inbox and one thread.
    {
      path: 'moderator-mail',
      lazy: async () => {
        const { StaffMailInboxPage } =
          await import('@/features/moderator-mail/components/StaffMailInboxPage');
        return { Component: StaffMailInboxPage };
      },
    },
    {
      path: 'moderator-mail/:reference',
      lazy: async () => {
        const { StaffMailThreadPage } =
          await import('@/features/moderator-mail/components/StaffMailThreadPage');
        return { Component: StaffMailThreadPage };
      },
    },
    // Support tickets (S1-E11-13; ADMIN-2h1): the inbox and one ticket, for owner, admin and
    // support.
    {
      path: 'support',
      lazy: async () => {
        const { StaffSupportInboxPage } =
          await import('@/features/support/components/StaffSupportInboxPage');
        return { Component: StaffSupportInboxPage };
      },
    },
    // Canned replies (S1-E11-13; ADMIN-2h3b): the list support staff insert into tickets.
    {
      path: 'support/canned',
      lazy: async () => {
        const { CannedRepliesPage } =
          await import('@/features/support/components/CannedRepliesPage');
        return { Component: CannedRepliesPage };
      },
    },
    {
      path: 'support/:number',
      lazy: async () => {
        const { StaffSupportTicketPage } =
          await import('@/features/support/components/StaffSupportTicketPage');
        return { Component: StaffSupportTicketPage };
      },
    },
    // Tags writers add, waiting for approval, and tags missing a name (CMS-1e): owner, admin and
    // moderator.
    {
      path: 'tags/:view?',
      lazy: async () => {
        const { TagsAdminPage } = await import('@/features/tags/components/staff/TagsAdminPage');
        return { Component: TagsAdminPage };
      },
    },
    // Forum categories, forums and subforums (FORUMS-1a, S1-E8-01): owner and admin, the
    // settings area.
    {
      path: 'forums',
      lazy: async () => {
        const { ForumsAdminPage } =
          await import('@/features/forums/components/staff/ForumsAdminPage');
        return { Component: ForumsAdminPage };
      },
    },
    // Moderation › Pictures to check (ADMIN-2e1b): the moderation team approves or rejects
    // pictures that wait for a person before anyone else sees them.
    {
      path: 'pictures',
      lazy: async () => {
        const { PicturesToCheckPage } =
          await import('@/features/moderation/components/PicturesToCheckPage');
        return { Component: PicturesToCheckPage };
      },
    },
    // Appeals against moderation decisions (S1-E10-07): owner, admin and moderator.
    {
      path: 'appeals',
      lazy: async () => {
        const { AppealsPage } = await import('@/features/moderation/components/AppealsPage');
        return { Component: AppealsPage };
      },
    },
    // Safety contacts and their monthly check (S1-E10-13b): support, admin and owner act.
    {
      path: 'safety-contacts',
      lazy: async () => {
        const { SafetyContactsAdminPage } =
          await import('@/features/safety/components/SafetyContactsAdminPage');
        return { Component: SafetyContactsAdminPage };
      },
    },
    // Writers' hub content (GAPS-12c): the writing prompts, kept by staff with the contests area.
    {
      path: 'hub',
      lazy: async () => {
        const { StaffHubPage } = await import('@/features/hub/components/staff/StaffHubPage');
        return { Component: StaffHubPage };
      },
    },
    // Contests (S1-E11-15; CONTESTS-13b1): owner and admin; the list and one contest's editor.
    {
      path: 'contests',
      lazy: async () => {
        const { StaffContestsPage } =
          await import('@/features/contests/components/staff/StaffContestsPage');
        return { Component: StaffContestsPage };
      },
    },
    {
      path: 'contests/:contestId',
      lazy: async () => {
        const { ContestEditorPage } =
          await import('@/features/contests/components/staff/ContestEditorPage');
        return { Component: ContestEditorPage };
      },
    },
    // Sponsors (S1-E12-02; SPONSORS-b2): owner and admin; campaigns, the review queue, sponsors
    // and what we never advertise, and one campaign's editor ("new" starts one).
    {
      path: 'sponsors',
      lazy: async () => {
        const { StaffSponsorsPage } =
          await import('@/features/sponsors/components/staff/StaffSponsorsPage');
        return { Component: StaffSponsorsPage };
      },
    },
    {
      path: 'sponsors/campaigns/:campaignId',
      lazy: async () => {
        const { CampaignEditorPage } =
          await import('@/features/sponsors/components/staff/CampaignEditorPage');
        return { Component: CampaignEditorPage };
      },
    },
    // The website CMS (S1-E11-06, S1-E11-10, S1-E11-12): owner and admin; the area picks the tab.
    {
      path: 'website/:area?',
      lazy: async () => {
        const { WebsiteAdminPage } =
          await import('@/features/website/components/staff/WebsiteAdminPage');
        return { Component: WebsiteAdminPage };
      },
    },
    // The page builder (S1-E11-34): landing pages for anyone holding the landing_pages area.
    {
      path: 'landing-pages',
      lazy: async () => {
        const { LandingPagesAdminPage } =
          await import('@/features/landing-pages/components/staff/LandingPagesAdminPage');
        return { Component: LandingPagesAdminPage };
      },
    },
    // Content settings, markets and languages (S1-E11-03, S1-E11-05): owner and admin.
    {
      path: 'settings',
      lazy: async () => {
        const { SettingsPage } = await import('@/features/settings/components/SettingsPage');
        return { Component: SettingsPage };
      },
    },
    // Staff roles and permissions (S1-E2-07a), now inside the shell.
    {
      path: 'roles',
      lazy: async () => {
        const { StaffRolesPage } = await import('@/features/staff/components/StaffRolesPage');
        return { Component: StaffRolesPage };
      },
    },
    // Users: the Accounts tab, one account, and the Invites tab (S1-E11-02; Invites from
    // S1-E11-17, owner and admin). The old /staff/invites address still works.
    // The on-call rota for removal orders (S1-E10-09): owner and admin edit, moderators and
    // support see who is on call.
    {
      path: 'on-call',
      lazy: async () => {
        const { OnCallRotaPage } = await import('@/features/moderation/components/OnCallRotaPage');
        return { Component: OnCallRotaPage };
      },
    },
    {
      path: 'users',
      lazy: async () => {
        const { UsersPage } = await import('@/features/staff/components/users/UsersPage');
        return { Component: UsersPage };
      },
    },
    // Manual age checks (S1-E2-08b): owner, admin and moderator.
    {
      path: 'users/age-checks',
      lazy: async () => {
        const { ManualAgeChecksPage } =
          await import('@/features/staff/components/age-checks/ManualAgeChecksPage');
        return { Component: ManualAgeChecksPage };
      },
    },
    // The waiting list (WAITLIST-1): owner and admin let people in.
    {
      path: 'waitlist',
      lazy: async () => {
        const { StaffWaitlistPage } =
          await import('@/features/staff/components/waitlist/StaffWaitlistPage');
        return { Component: StaffWaitlistPage };
      },
    },
    {
      path: 'users/invites',
      lazy: async () => {
        const { InvitesPage } = await import('@/features/staff/components/invites/InvitesPage');
        return { Component: InvitesPage };
      },
    },
    {
      path: 'users/:userId',
      lazy: async () => {
        const { AccountPage } = await import('@/features/staff/components/users/AccountPage');
        return { Component: AccountPage };
      },
    },
    { path: 'invites', element: <Navigate to="/staff/users/invites" replace /> },
    // Every story (S1-E11-07): owner, admin, moderator and support; one story's page beside it.
    {
      path: 'stories',
      lazy: async () => {
        const { StaffStoriesPage } =
          await import('@/features/staff/components/stories/StaffStoriesPage');
        return { Component: StaffStoriesPage };
      },
    },
    {
      path: 'stories/:storyId',
      lazy: async () => {
        const { StaffStoryPage } =
          await import('@/features/staff/components/stories/StaffStoryPage');
        return { Component: StaffStoryPage };
      },
    },
    // Data requests (S1-E11-09; ADMIN-2c1): owner, admin and support; a new one and one request.
    {
      path: 'data-requests',
      lazy: async () => {
        const { StaffDataRequestsPage } =
          await import('@/features/data-requests/components/staff/StaffDataRequestsPage');
        return { Component: StaffDataRequestsPage };
      },
    },
    {
      path: 'data-requests/new',
      lazy: async () => {
        const { NewDataRequestPage } =
          await import('@/features/data-requests/components/staff/NewDataRequestPage');
        return { Component: NewDataRequestPage };
      },
    },
    {
      path: 'data-requests/:requestId',
      lazy: async () => {
        const { StaffDataRequestPage } =
          await import('@/features/data-requests/components/staff/StaffDataRequestPage');
        return { Component: StaffDataRequestPage };
      },
    },
    // Stories › Featured: the ranking and the picks for Featured this week (S1-E5-10): owner and
    // admin.
    {
      path: 'featured',
      lazy: async () => {
        const { FeaturedPage } = await import('@/features/staff/components/featured/FeaturedPage');
        return { Component: FeaturedPage };
      },
    },
    // Classics: add, check and publish public-domain works (S1-E11-16): owner and admin.
    {
      path: 'classics',
      lazy: async () => {
        const { ClassicsPage } = await import('@/features/staff/components/classics/ClassicsPage');
        return { Component: ClassicsPage };
      },
    },
    // Schools › Verify teachers (S1-E2-11): owner, admin and moderators with the permission.
    {
      path: 'schools/teachers',
      lazy: async () => {
        const { TeacherChecksPage } =
          await import('@/features/staff/components/schools/TeacherChecksPage');
        return { Component: TeacherChecksPage };
      },
    },
    // Schools › Class spaces (bundle CLASSES, part d; S1-E8-11 criterion 10): the same access.
    {
      path: 'schools/classes',
      lazy: async () => {
        const { ClassSpacesPage } =
          await import('@/features/staff/components/schools/ClassSpacesPage');
        return { Component: ClassSpacesPage };
      },
    },
    // Schools › Certificates (bundle CLASSES, part e; S1-E8-12 criterion 7): the same access.
    {
      path: 'schools/certificates',
      lazy: async () => {
        const { StaffCertificatesPage } =
          await import('@/features/staff/components/schools/StaffCertificatesPage');
        return { Component: StaffCertificatesPage };
      },
    },
    // The March test numbers (S1-E15-02): owner and admin; moderators see a pointer to the queue.
    {
      path: 'metrics',
      lazy: async () => {
        const { MarchNumbersPage } =
          await import('@/features/staff/components/metrics/MarchNumbersPage');
        return { Component: MarchNumbersPage };
      },
    },
    // The app's logs: calls, failures and crashes, for owner and admin (LOGS-1).
    {
      path: 'logs',
      lazy: async () => {
        const { LogsPage } = await import('@/features/staff/components/logs/LogsPage');
        return { Component: LogsPage };
      },
    },
    // The audit log: search and CSV export for owner and admin (S1-E11-01).
    {
      path: 'audit-log',
      lazy: async () => {
        const { AuditLogPage } = await import('@/features/staff/components/AuditLogPage');
        return { Component: AuditLogPage };
      },
    },
  ],
};

/**
 * The website's account deletion page (S1-E13-03, criterion 5; Google Play asks for a web address
 * where people can delete their account without the app). Loaded when opened.
 */
const accountDeletionRoutes: RouteObject[] = [
  {
    path: '/delete-account',
    HydrateFallback: () => null,
    lazy: async () => {
      const { DeleteAccountPage } =
        await import('@/features/account-deletion/components/DeleteAccountPage');
      return { Component: DeleteAccountPage };
    },
  },
  {
    // Where the closing email's link lands after logging in (INACTIVE-2). While the account is
    // closing, AccountClosingGate shows the closing page here instead; this route only sends
    // everyone else on.
    path: ACCOUNT_CLOSING_PATH,
    HydrateFallback: () => null,
    lazy: async () => {
      const { AccountClosingRedirect } =
        await import('@/features/account-deletion/components/AccountClosingRedirect');
      return { Component: AccountClosingRedirect };
    },
  },
];

/**
 * The age check with Yoti (S1-E2-08): the start page and where Yoti sends the person back. Each is
 * loaded when opened.
 */
const ageCheckRoutes: RouteObject[] = [
  {
    path: '/age-check',
    HydrateFallback: () => null,
    lazy: async () => {
      const { AgeCheckPage } = await import('@/features/age-check/components/AgeCheckPage');
      return { Component: AgeCheckPage };
    },
  },
  {
    path: '/age-check/return',
    HydrateFallback: () => null,
    lazy: async () => {
      const { AgeCheckReturnPage } =
        await import('@/features/age-check/components/AgeCheckReturnPage');
      return { Component: AgeCheckReturnPage };
    },
  },
];

/**
 * Parental consent (S1-E2-03): the writer's page and the page a parent opens from the email. Each
 * is loaded when opened; the parent's page works signed out. The Teacher badge's link page
 * (S1-E2-11) sits here too: another page opened from an email with a token after "#".
 */
const parentConsentRoutes: RouteObject[] = [
  {
    path: '/parent-consent',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ParentConsentPage } =
        await import('@/features/parent-consent/components/ParentConsentPage');
      return { Component: ParentConsentPage };
    },
  },
  {
    path: '/parent-consent/answer',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ParentAnswerPage } =
        await import('@/features/parent-consent/components/ParentAnswerPage');
      return { Component: ParentAnswerPage };
    },
  },
  // The parent's separate yes to suggestions (S1-E2-03b, LOOK-4c): works signed out.
  {
    path: '/parent-consent/spotlight',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ParentSpotlightPage } =
        await import('@/features/parent-consent/components/ParentSpotlightPage');
      return { Component: ParentSpotlightPage };
    },
  },
  // A data request's link for an under-16's parent or guardian (ADMIN-2c3): works signed out.
  {
    path: '/data-request/parent',
    HydrateFallback: () => null,
    lazy: async () => {
      const { DataRequestParentPage } =
        await import('@/features/data-requests/components/parent/DataRequestParentPage');
      return { Component: DataRequestParentPage };
    },
  },
  // The Teacher badge's school email link (S1-E2-11): works signed out, on any device.
  {
    path: '/teacher-check/confirm',
    HydrateFallback: () => null,
    lazy: async () => {
      const { TeacherConfirmPage } =
        await import('@/features/teacher-badge/components/TeacherConfirmPage');
      return { Component: TeacherConfirmPage };
    },
  },
];

/**
 * The Writers' hub, the signed-in home the logo opens, its learning path (GAPS-12g) and Resources,
 * opened from the account menu (bundle G9 WRITING, part a), each loaded when opened.
 */
const hubRoutes: RouteObject[] = [
  lazyPage(
    '/hub',
    async () => (await import('@/features/hub/components/WritersHubPage')).WritersHubPage,
  ),
  // The learning path's lessons, one day at a time (GAPS-12g).
  lazyPage(
    '/hub/path',
    async () => (await import('@/features/hub/components/LearningPathPage')).LearningPathPage,
  ),
  lazyPage(
    '/resources',
    async () => (await import('@/features/hub/components/ResourcesPage')).ResourcesPage,
  ),
];

/**
 * Notifications (S1-E7-01), loaded when opened; the bell in the top bar links here. And the
 * one-click unsubscribe from a notification email (S1-E7-02), which works signed out.
 */
const notificationRoutes: RouteObject[] = [
  {
    path: '/notifications',
    HydrateFallback: () => null,
    lazy: async () => {
      const { NotificationsPage } =
        await import('@/features/notifications/components/NotificationsPage');
      return { Component: NotificationsPage };
    },
  },
  {
    path: '/unsubscribe',
    HydrateFallback: () => null,
    lazy: async () => {
      const { UnsubscribePage } =
        await import('@/features/notifications/components/UnsubscribePage');
      return { Component: UnsubscribePage };
    },
  },
];

/**
 * Private messages (S1-E9-01): the chats at /messages and one chat, by the other person's
 * username, at /messages/:handle. The page is loaded when opened.
 */
const messagesRoutes: RouteObject[] = ['/messages', '/messages/:handle'].map((path) => ({
  path,
  HydrateFallback: () => null,
  lazy: async () => {
    const { MessagesPage } = await import('@/features/messages/components/MessagesPage');
    return { Component: MessagesPage };
  },
}));

/**
 * My certificates, one certificate and the public check of a code (bundle CLASSES, part e;
 * S1-E8-12). Loaded when opened.
 */
const certificateRoutes: RouteObject[] = [
  {
    path: '/certificates',
    HydrateFallback: () => null,
    lazy: async () => {
      const { MyCertificatesPage } =
        await import('@/features/certificates/components/MyCertificatesPage');
      return { Component: MyCertificatesPage };
    },
  },
  {
    path: '/certificates/:certificateId',
    HydrateFallback: () => null,
    lazy: async () => {
      const { CertificatePage } =
        await import('@/features/certificates/components/CertificatePage');
      return { Component: CertificatePage };
    },
  },
  {
    path: '/verify',
    HydrateFallback: () => null,
    lazy: async () => {
      const { VerifyCertificatePage } =
        await import('@/features/certificates/components/VerifyCertificatePage');
      return { Component: VerifyCertificatePage };
    },
  },
];

/**
 * Your support requests (S1-E11-13; ADMIN-2h1): the list, asking for help and one request.
 * Settings links to the list. Each is loaded when opened.
 */
const supportRoutes: RouteObject[] = [
  {
    path: '/support',
    HydrateFallback: () => null,
    lazy: async () => {
      const { MySupportPage } = await import('@/features/support/components/MySupportPage');
      return { Component: MySupportPage };
    },
  },
  {
    path: '/support/new',
    HydrateFallback: () => null,
    lazy: async () => {
      const { NewSupportRequestPage } =
        await import('@/features/support/components/NewSupportRequestPage');
      return { Component: NewSupportRequestPage };
    },
  },
  {
    path: '/support/:number',
    HydrateFallback: () => null,
    lazy: async () => {
      const { MySupportTicketPage } =
        await import('@/features/support/components/MySupportTicketPage');
      return { Component: MySupportTicketPage };
    },
  },
];

/**
 * Messages to the moderators (S1-E10-11): the list, a new message and one thread; a
 * moderator_mail_reply notification links to the thread. The three load together, from
 * memberMailPages, the first time one is opened (bundle G8c).
 */
const moderatorMailRoutes: RouteObject[] = [
  {
    path: '/moderator-mail',
    HydrateFallback: () => null,
    lazy: async () => {
      const { MyMailPage } = await import('@/features/moderator-mail/memberMailPages');
      return { Component: MyMailPage };
    },
  },
  {
    path: '/moderator-mail/new',
    HydrateFallback: () => null,
    lazy: async () => {
      const { NewMailPage } = await import('@/features/moderator-mail/memberMailPages');
      return { Component: NewMailPage };
    },
  },
  {
    path: '/moderator-mail/:reference',
    HydrateFallback: () => null,
    lazy: async () => {
      const { MailThreadPage } = await import('@/features/moderator-mail/memberMailPages');
      return { Component: MailThreadPage };
    },
  },
];

/**
 * Lane A: writing and reading (S1-E3, S1-E4). The writer screens are loaded only when someone
 * opens them, so readers never download the form or (S1-E3-02a) the editor.
 */
const writeRoutes: RouteObject[] = [
  {
    path: '/write',
    HydrateFallback: () => null,
    lazy: async () => {
      const { YourWritingPage } = await import('@/features/writing/components/YourWritingPage');
      return { Component: YourWritingPage };
    },
  },
  // Every comment on the writer's chapters (GAPS-5), opened from "See all comments" on /write.
  {
    path: '/write/comments',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ChapterCommentsPage } =
        await import('@/features/writing/components/ChapterCommentsPage');
      return { Component: ChapterCommentsPage };
    },
  },
  {
    path: '/write/new',
    HydrateFallback: () => null,
    lazy: async () => {
      const { NewStoryPage } = await import('@/features/writing/components/NewStoryPage');
      return { Component: NewStoryPage };
    },
  },
  // Story Atlas (S1-E17): the planning side of each of the writer's stories. /plan opens the story
  // planned last on this device; /plan/s/:storySlug is that story's at-a-glance page.
  {
    path: '/plan',
    HydrateFallback: () => null,
    lazy: async () => {
      const { AtlasHomePage } = await import('@/features/atlas/components/AtlasHomePage');
      return { Component: AtlasHomePage };
    },
  },
  {
    path: '/plan/s/:storySlug',
    HydrateFallback: () => null,
    lazy: async () => {
      const { StoryAtlasPage } = await import('@/features/atlas/components/StoryAtlasPage');
      return { Component: StoryAtlasPage };
    },
  },
  // A story's characters in Story Atlas (S1-E17-08): the cast list, and one character's sheet.
  {
    path: '/plan/s/:storySlug/characters/:characterId?',
    HydrateFallback: () => null,
    lazy: async () => {
      const { CharactersPage } = await import('@/features/atlas/components/CharactersPage');
      return { Component: CharactersPage };
    },
  },
  // How a story's characters are connected (S1-E17-14 to 16): the map, the family tree and the
  // list of relationships.
  {
    path: '/plan/s/:storySlug/connections',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ConnectionsPage } = await import('@/features/atlas/components/ConnectionsPage');
      return { Component: ConnectionsPage };
    },
  },
  // A story's world, once called its bible (S1-E17-17 and 18): its sections and entries, and one
  // entry when it is open. Renamed "Story world" by Robert on 2 Nov 2026 (ADMIN-2a2); the old
  // /bible address still works through OldBibleAddressRedirect.
  {
    path: '/plan/s/:storySlug/bible/:entryId?',
    HydrateFallback: () => null,
    lazy: async () => {
      const { OldBibleAddressRedirect } =
        await import('@/features/atlas/components/OldBibleAddressRedirect');
      return { Component: OldBibleAddressRedirect };
    },
  },
  {
    path: '/plan/s/:storySlug/world/:entryId?',
    HydrateFallback: () => null,
    lazy: async () => {
      const { BiblePage } = await import('@/features/atlas/components/BiblePage');
      return { Component: BiblePage };
    },
  },
  // A story's storyline (S1-E17-19 to 22): the chapter board, the timeline and the
  // point-of-view lanes, one toggle apart.
  {
    path: '/plan/s/:storySlug/storyline',
    HydrateFallback: () => null,
    lazy: async () => {
      const { StorylinePage } = await import('@/features/atlas/components/StorylinePage');
      return { Component: StorylinePage };
    },
  },
  // A story's questions and ideas (S1-E17-27 and 28): the quick-add box and the list to tick off.
  {
    path: '/plan/s/:storySlug/ideas',
    HydrateFallback: () => null,
    lazy: async () => {
      const { IdeasPage } = await import('@/features/atlas/components/IdeasPage');
      return { Component: IdeasPage };
    },
  },
  // A story's marketing notes (S1-E17-29), with the back-cover preview.
  {
    path: '/plan/s/:storySlug/marketing',
    HydrateFallback: () => null,
    lazy: async () => {
      const { MarketingPage } = await import('@/features/atlas/components/MarketingPage');
      return { Component: MarketingPage };
    },
  },
  // Search across one story (S1-E17-30): the results of the top bar's search box.
  {
    path: '/plan/s/:storySlug/search',
    HydrateFallback: () => null,
    lazy: async () => {
      const { AtlasSearchPage } = await import('@/features/atlas/components/AtlasSearchPage');
      return { Component: AtlasSearchPage };
    },
  },
  // What readers can see of a story's plan (S1-E17-32): the area switches, and the writer's
  // "Preview as a reader" of one area (or of one character's page).
  {
    path: '/plan/s/:storySlug/readers',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ReaderViewPage } = await import('@/features/atlas/components/ReaderViewPage');
      return { Component: ReaderViewPage };
    },
  },
  ...[
    '/plan/s/:storySlug/preview',
    '/plan/s/:storySlug/preview/:areaPath',
    '/plan/s/:storySlug/preview/:areaPath/:itemId',
  ].map((path): RouteObject => ({
    path,
    HydrateFallback: () => null,
    lazy: async () => {
      const { PlanPreviewPage } = await import('@/features/atlas/components/PlanPreviewPage');
      return { Component: PlanPreviewPage };
    },
  })),
  // Story settings (S1-E3-05): the writer changes a story's basics, cover, status and comments,
  // or deletes it.
  {
    path: '/write/s/:storySlug/settings',
    HydrateFallback: () => null,
    lazy: async () => {
      const { StorySettingsPage } = await import('@/features/writing/components/StorySettingsPage');
      return { Component: StorySettingsPage };
    },
  },
  // Design it in Canva (S1-E3-12): the new tab's two pages, on the way to Canva and back.
  {
    path: '/canva/start',
    HydrateFallback: () => null,
    lazy: async () => {
      const { CanvaStartPage } = await import('@/features/canva/components/CanvaStartPage');
      return { Component: CanvaStartPage };
    },
  },
  {
    path: '/canva/return',
    HydrateFallback: () => null,
    lazy: async () => {
      const { CanvaReturnPage } = await import('@/features/canva/components/CanvaReturnPage');
      return { Component: CanvaReturnPage };
    },
  },
  // Manage chapters (S1-E3-04): reorder, rename, unpublish, delete and undo one story's chapters.
  {
    path: '/write/s/:storySlug/chapters',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ManageChaptersPage } =
        await import('@/features/writing/components/ManageChaptersPage');
      return { Component: ManageChaptersPage };
    },
  },
  // The chapter editor (S1-E3-02a): the writer's own chapter, by the story's slug and the
  // chapter's 8-character code (never a position, so reordering keeps links alive).
  {
    path: '/write/s/:storySlug/c/:chapterCode',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ChapterEditorPage } = await import('@/features/writing/components/ChapterEditorPage');
      return { Component: ChapterEditorPage };
    },
  },
  // The parts of a story's plan its writer shares (S1-E17-33): /s/<story>/atlas/<area>, and one
  // character's or one world entry's page (GAPS-4). "atlas" is five letters, so it can never be a chapter's 8-character code.
  ...['/s/:storySlug/atlas/:areaPath', '/s/:storySlug/atlas/:areaPath/:itemId'].map(
    (path): RouteObject => ({
      path,
      HydrateFallback: () => null,
      lazy: async () => {
        const { PublicPlanPage } = await import('@/features/atlas/components/PublicPlanPage');
        return { Component: PublicPlanPage };
      },
    }),
  ),
  // The chapter reader (S1-E4-01a): a chapter by the story's slug and the chapter's code; the
  // same rules as the story page, through get_chapter() (ADR 0004).
  {
    path: '/s/:storySlug/:chapterCode',
    HydrateFallback: () => null,
    // Starts reading the chapter while the reader's code downloads (S1-E4-01b, the 2-second
    // budget); it returns at once, so it never holds the page back.
    loader: ({ params }) => {
      prefetchChapter(params.storySlug ?? '', params.chapterCode ?? '');
      return null;
    },
    lazy: async () => {
      const { ChapterReaderPage } = await import('@/features/reading/components/ChapterReaderPage');
      return { Component: ChapterReaderPage };
    },
  },
  // The same reader opened at a shared passage or picture (S1-E4-11): the spot is "p3" or "p3-5",
  // the blocks to highlight; the link preview for this address shows the passage.
  {
    path: '/s/:storySlug/:chapterCode/:spot',
    HydrateFallback: () => null,
    // Starts reading the chapter while the reader's code downloads (S1-E4-01b, the 2-second
    // budget); it returns at once, so it never holds the page back.
    loader: ({ params }) => {
      prefetchChapter(params.storySlug ?? '', params.chapterCode ?? '');
      return null;
    },
    lazy: async () => {
      const { ChapterReaderPage } = await import('@/features/reading/components/ChapterReaderPage');
      return { Component: ChapterReaderPage };
    },
  },
  // Discover (S1-E5-01) and every list's See all page (S1-E5-09): the Discover shelves, a
  // category, a tag and a writer's stories share one page; the address decides the list.
  {
    path: '/discover',
    HydrateFallback: () => null,
    lazy: async () => {
      const { DiscoverPage } = await import('@/features/discovery/components/DiscoverPage');
      return { Component: DiscoverPage };
    },
  },
  ...[
    '/discover/all/:listKind',
    '/discover/c/:categorySlug',
    '/discover/t/:tag',
    '/u/:handle/stories',
    // Someone's library, from their profile, when they let the reader see it (S1-E13-01).
    '/u/:readerHandle/library',
    // Every story a search finds (S1-E5-04): the term is in ?q=.
    '/search/stories',
  ].map((path): RouteObject => ({
    path,
    HydrateFallback: () => null,
    lazy: async () => {
      const { StoryListPage } = await import('@/features/discovery/components/StoryListPage');
      return { Component: StoryListPage };
    },
  })),
  // The forums (FORUMS-1a, S1-E8-01): the index and one forum or subforum. Anyone can read them.
  {
    path: '/forums',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ForumsPage } = await import('@/features/forums/components/ForumsPage');
      return { Component: ForumsPage };
    },
  },
  // Forum search (FORUMS-1f, S1-E8-10). A static path wins over /forums/:forumSlug, and no forum
  // may take "search" as its address (the forums_slug_not_search constraint).
  {
    path: '/forums/search',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ForumSearchPage } = await import('@/features/forums/components/ForumSearchPage');
      return { Component: ForumSearchPage };
    },
  },
  {
    path: '/forums/:forumSlug',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ForumPage } = await import('@/features/forums/components/ForumPage');
      return { Component: ForumPage };
    },
  },
  // Threads and posts (FORUMS-1b, S1-E8-02): start a thread, and one thread with its posts.
  {
    path: '/forums/:forumSlug/new',
    HydrateFallback: () => null,
    lazy: async () => {
      const { NewThreadPage } = await import('@/features/forums/components/NewThreadPage');
      return { Component: NewThreadPage };
    },
  },
  {
    path: '/forums/:forumSlug/:threadNumber',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ThreadPage } = await import('@/features/forums/components/ThreadPage');
      return { Component: ThreadPage };
    },
  },
  // Spaces people create (FORUMS-2a, S1-E8-06): the list, a new space, one space, its settings
  // and a new thread in it. A static path wins over /spaces/:spaceSlug, and no space may take
  // "new" as its address (the spaces_slug_not_new constraint).
  {
    path: '/spaces',
    HydrateFallback: () => null,
    lazy: async () => {
      const { SpacesPage } = await import('@/features/spaces/components/SpacesPage');
      return { Component: SpacesPage };
    },
  },
  {
    path: '/spaces/new',
    HydrateFallback: () => null,
    lazy: async () => {
      const { NewSpacePage } = await import('@/features/spaces/components/NewSpacePage');
      return { Component: NewSpacePage };
    },
  },
  {
    path: '/spaces/:spaceSlug',
    HydrateFallback: () => null,
    lazy: async () => {
      const { SpacePage } = await import('@/features/spaces/components/SpacePage');
      return { Component: SpacePage };
    },
  },
  {
    path: '/spaces/:spaceSlug/new',
    HydrateFallback: () => null,
    lazy: async () => {
      const { SpaceNewThreadPage } =
        await import('@/features/spaces/components/SpaceNewThreadPage');
      return { Component: SpaceNewThreadPage };
    },
  },
  // A class invite link (bundle CLASSES, part a; S1-E8-11): under /class/ so a code never
  // clashes with a space's address.
  // With no code, the same page asks for one (bundle CLASSES, part b).
  {
    path: '/class',
    HydrateFallback: () => null,
    lazy: async () => {
      const { JoinClassPage } = await import('@/features/spaces/components/JoinClassPage');
      return { Component: JoinClassPage };
    },
  },
  {
    path: '/class/:code',
    HydrateFallback: () => null,
    lazy: async () => {
      const { JoinClassPage } = await import('@/features/spaces/components/JoinClassPage');
      return { Component: JoinClassPage };
    },
  },
  {
    path: '/spaces/:spaceSlug/settings',
    HydrateFallback: () => null,
    lazy: async () => {
      const { SpaceSettingsPage } = await import('@/features/spaces/components/SpaceSettingsPage');
      return { Component: SpaceSettingsPage };
    },
  },
  // Every story shared only with a class, the See all of its shelf (bundle CLASSES, part c).
  {
    path: '/spaces/:spaceSlug/stories',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ClassStoriesPage } = await import('@/features/spaces/components/ClassStoriesPage');
      return { Component: ClassStoriesPage };
    },
  },
  // A class's certificates, for its teacher (bundle CLASSES, part e; S1-E8-12).
  {
    path: '/spaces/:spaceSlug/certificates',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ClassCertificatesPage } =
        await import('@/features/certificates/components/ClassCertificatesPage');
      return { Component: ClassCertificatesPage };
    },
  },
  // A space's members and its moderation log (FORUMS-2b, S1-E8-07).
  {
    path: '/spaces/:spaceSlug/members',
    HydrateFallback: () => null,
    lazy: async () => {
      const { SpaceMembersPage } = await import('@/features/spaces/components/SpaceMembersPage');
      return { Component: SpaceMembersPage };
    },
  },
  {
    path: '/spaces/:spaceSlug/log',
    HydrateFallback: () => null,
    lazy: async () => {
      const { SpaceLogPage } = await import('@/features/spaces/components/SpaceLogPage');
      return { Component: SpaceLogPage };
    },
  },
  // The reader's library (S1-E4-03) and each shelf's See all page, which is a story list.
  {
    path: '/library',
    HydrateFallback: () => null,
    lazy: async () => {
      const { LibraryPage } = await import('@/features/library/components/LibraryPage');
      return { Component: LibraryPage };
    },
  },
  // One reading list (GAPS-6). Listed before /library/:shelf; the router also ranks its fixed
  // "lists" part above a shelf's name, so the two never mix.
  {
    path: '/library/lists/:listId',
    HydrateFallback: () => null,
    lazy: async () => {
      const { ReadingListPage } = await import('@/features/library/components/ReadingListPage');
      return { Component: ReadingListPage };
    },
  },
  {
    path: '/library/:shelf',
    HydrateFallback: () => null,
    lazy: async () => {
      const { StoryListPage } = await import('@/features/discovery/components/StoryListPage');
      return { Component: StoryListPage };
    },
  },
  // Search (S1-E5-04): the page with stories, writers and tags, and the writers' and tags' own
  // See all pages; the term is in ?q=.
  {
    path: '/search',
    HydrateFallback: () => null,
    lazy: async () => {
      const { SearchPage } = await import('@/features/search/components/SearchPage');
      return { Component: SearchPage };
    },
  },
  ...(['writers', 'tags'] as const).map((group): RouteObject => ({
    path: `/search/${group}`,
    HydrateFallback: () => null,
    lazy: async () => {
      const { SearchGroupPage } = await import('@/features/search/components/SearchGroupPage');
      return { Component: () => <SearchGroupPage group={group} /> };
    },
  })),
  // A writer's public profile (S1-E5-05): by username, never the user ID (architecture 1.6);
  // the page reaches the profile only through get_writer_profile() (ADR 0004).
  {
    path: '/u/:handle',
    HydrateFallback: () => null,
    lazy: async () => {
      const { WriterProfilePage } = await import('@/features/people/components/WriterProfilePage');
      return { Component: WriterProfilePage };
    },
  },
  // The public story page (S1-E3-05): readers reach a story only through get_story_page()
  // (ADR 0004); the address carries the story's slug, never an ID.
  {
    path: '/s/:storySlug',
    HydrateFallback: () => null,
    lazy: async () => {
      const { StoryPage } = await import('@/features/reading/components/StoryPage');
      return { Component: StoryPage };
    },
  },
];

const websitePages: RouteObject[] = [
  // The public home page, all of its copy from the website CMS (S1-E5-08, S1-E11-06).
  {
    index: true,
    HydrateFallback: () => null,
    lazy: async () => ({
      Component: (await import('@/features/website/components/WebsiteHomePage')).WebsiteHomePage,
    }),
  },
  // Help: the CMS help pages and questions in the address's language (S1-E11-12).
  lazyPage(
    'help',
    async () => (await import('@/features/website/components/HelpCentrePage')).HelpCentrePage,
  ),
  lazyPage(
    'help/:slug',
    async () => (await import('@/features/website/components/HelpPageView')).HelpPageView,
  ),
  // S1-E11-14: a landing page for a contest, campaign or information, from the CMS.
  lazyPage(
    'c/:slug',
    async () =>
      (await import('@/features/landing-pages/components/LandingPageScreen')).LandingPageScreen,
  ),
  // Anything else under a place ("/ro/en/nothing-here").
  { path: '*', element: <NotFoundPage /> },
];

/**
 * Loads the forwarder for an older website address.
 *
 * @param path - the older address ("/", "/help")
 * @returns the route
 */
function forwardedPage(path: string): RouteObject {
  return lazyPage(
    path,
    async () => (await import('@/features/website/components/WebsiteForward')).WebsiteForward,
  );
}

/**
 * The public website: the home page, Help, landing pages and the Legal centre.
 *
 * LOCALISE-1 (Robert, 11 Nov 2026): the CMS pages live at "/<country>/<language>/…", such as
 * "/se/sv/help", one page translated per language. The older addresses ("/", "/help",
 * "/help/<name>", "/c/<name>") forward to the visitor's country and language. The Legal centre
 * keeps its one address: its texts are documents, not CMS pages, and the gates that keep it open
 * during maintenance and account closing match on "/legal".
 */
const websiteRoutes: RouteObject[] = [
  {
    path: '/:country/:language',
    HydrateFallback: () => null,
    lazy: async () => ({
      Component: (await import('@/features/website/components/LocalisedWebsiteLayout'))
        .LocalisedWebsiteLayout,
    }),
    children: websitePages,
  },
  forwardedPage('/'),
  forwardedPage('/help'),
  forwardedPage('/help/:slug'),
  forwardedPage('/c/:slug'),
  // The Legal centre (S1-E14-01): /legal opens the terms; each document has its own address.
  { path: '/legal', element: <Navigate to="/legal/terms" replace /> },
  lazyPage(
    '/legal/:documentSlug',
    async () => (await import('@/features/legal/components/LegalCentrePage')).LegalCentrePage,
  ),
];

/**
 * Signing up, signing in and the first set-up, all loaded when opened (QA-6), so a reader who is
 * already signed in never downloads them.
 */
const signInRoutes: RouteObject[] = [
  // Sign-up (S1-E2-01): /join/<code> is an invite link (S1-E11-17); /auth/confirm is where the
  // confirmation and log-in emails land (supabase/templates/).
  lazyPage(
    '/sign-up',
    async () => (await import('@/features/auth/components/SignUpPage')).SignUpPage,
  ),
  lazyPage(
    '/join/:code',
    async () => (await import('@/features/auth/components/SignUpPage')).SignUpPage,
  ),
  lazyPage(
    '/auth/confirm',
    async () => (await import('@/features/auth/components/ConfirmEmailPage')).ConfirmEmailPage,
  ),
  // Where Google, Apple and Microsoft send the person back (S1-E2-09).
  lazyPage(
    '/auth/social-return',
    async () => (await import('@/features/auth/components/SocialReturnPage')).SocialReturnPage,
  ),
  // Log in and password reset (S1-E2-05): /reset-password is where the reset email lands.
  lazyPage(
    '/sign-in',
    async () => (await import('@/features/auth/components/SignInPage')).SignInPage,
  ),
  lazyPage(
    '/forgot-password',
    async () => (await import('@/features/auth/components/ForgotPasswordPage')).ForgotPasswordPage,
  ),
  lazyPage(
    '/reset-password',
    async () => (await import('@/features/auth/components/ResetPasswordPage')).ResetPasswordPage,
  ),
  // Once sign-up is public, a visitor from a closed market lands here (S1-E2-10).
  lazyPage(
    '/not-open',
    async () => (await import('@/features/auth/components/NotOpenPage')).NotOpenPage,
  ),
  // The links in the "Tell me when you open here" email: confirm or remove (G5a).
  lazyPage(
    '/open-here/:action',
    async () => (await import('@/features/auth/components/OpenHerePage')).OpenHerePage,
  ),
  // Set up your profile (S1-E2-04, S1-E2-06): the steps after the email is confirmed (and, for
  // under-18s, the age check); names are changed later in Settings.
  lazyPage(
    '/setup',
    async () => (await import('@/features/onboarding/components/OnboardingPage')).OnboardingPage,
  ),
];

/**
 * Every route in the app, in one list so a reader can see the whole map at a glance.
 * Exported separately from the router so tests can render a route in memory.
 */
export const appRoutes: RouteObject[] = [
  // The admin site has its own frame (the staff bar), so it sits beside the public layout.
  staffRoutes,
  {
    element: <AppLayout />,
    // If the frame itself fails, the error page shows on its own (S1-E1-05).
    errorElement: <ErrorPage />,
    children: [
      {
        // A page that fails shows "Something went wrong on our side" inside the frame, and the
        // error goes to our own error log without anything personal (S1-E1-05, board 7.4).
        errorElement: <ErrorPage />,
        children: pageRoutes(),
      },
    ],
  },
];

/**
 * The pages inside the frame.
 *
 * @returns one route per page, in the order a reader meets them
 */
function pageRoutes(): RouteObject[] {
  return [
    ...websiteRoutes,
    ...signInRoutes,
    // Settings loads when opened (PEOPLE-1): its bio and blocked-accounts sections bring the
    // people feature, which the first download of every page (the chapter reader's included)
    // shouldn't carry.
    {
      path: '/settings',
      HydrateFallback: () => null,
      lazy: async () => {
        const { SettingsPage } = await import('@/features/account/components/SettingsPage');
        return { Component: SettingsPage };
      },
    },
    ...accountDeletionRoutes,
    ...ageCheckRoutes,
    ...parentConsentRoutes,
    ...notificationRoutes,
    ...hubRoutes,
    // My reports and decisions (S1-E10-04): statements of reasons and the reports a person sent;
    // a decision's notification links here. Loaded when opened.
    {
      path: '/my-reports',
      HydrateFallback: () => null,
      lazy: async () => {
        const { MyReportsPage } = await import('@/features/statements/components/MyReportsPage');
        return { Component: MyReportsPage };
      },
    },
    ...certificateRoutes,
    ...moderatorMailRoutes,
    ...supportRoutes,
    ...messagesRoutes,
    // Lane A: writing and reading (S1-E3, S1-E4).
    ...writeRoutes,
    // Contact us: the form for users and visitors (S1-E14-04; Lane C), loaded when opened.
    {
      path: '/contact',
      lazy: async () => {
        const { ContactPage } = await import('@/features/contact/components/ContactPage');
        return { Component: ContactPage };
      },
    },
    // Report illegal content: the public report form and the authorities' contact point
    // (S1-E10-02; Lane C), loaded when opened.
    {
      path: '/report',
      lazy: async () => {
        const { NoticePage } = await import('@/features/notices/components/NoticePage');
        return { Component: NoticePage };
      },
    },
    ...(isDesignPageIncluded ? [designRoute] : []),
    // Any other address: "We can't find that page" in the reader's language (S1-E2-QA, board
    // 7.4). Its search button waits for Search (S1-E5-04).
    { path: '*', element: <NotFoundPage /> },
  ];
}
