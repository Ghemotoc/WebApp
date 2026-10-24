/**
 * The list of pages and their addresses (stories S1-E1-01 and S1-E1-03).
 *
 * Who uses it: src/main.tsx hands `appRoutes` to React Router's RouterProvider.
 * What it shows: every public page sits inside AppLayout (top bar, page, footer); each route
 * points to one page component inside src/features/<feature>/.
 * Every new screen adds its route here, and a line to docs/code-tour.md.
 */
import { Navigate, type RouteObject } from 'react-router';

import { SetupPage } from '@/features/account/components/SetupPage';
import { ConfirmEmailPage } from '@/features/auth/components/ConfirmEmailPage';
import { ForgotPasswordPage } from '@/features/auth/components/ForgotPasswordPage';
import { NotOpenPage } from '@/features/auth/components/NotOpenPage';
import { ResetPasswordPage } from '@/features/auth/components/ResetPasswordPage';
import { SignInPage } from '@/features/auth/components/SignInPage';
import { SignUpPage } from '@/features/auth/components/SignUpPage';
import { ErrorPage } from '@/features/errors/components/ErrorPage';
import { HomePage } from '@/features/home/components/HomePage';
import { LegalCentrePage } from '@/features/legal/components/LegalCentrePage';
import { prefetchChapter } from '@/features/reading/api/chapterPrefetch';

import { AppLayout } from './shell/AppLayout';
import { NotFoundPage } from './shell/NotFoundPage';

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
    // Staff roles and permissions (S1-E2-07a), now inside the shell.
    {
      path: 'roles',
      lazy: async () => {
        const { StaffRolesPage } = await import('@/features/staff/components/StaffRolesPage');
        return { Component: StaffRolesPage };
      },
    },
    // Invite links for the March test, owner and admin (S1-E11-17).
    {
      path: 'invites',
      lazy: async () => {
        const { InvitesPage } = await import('@/features/staff/components/invites/InvitesPage');
        return { Component: InvitesPage };
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
  {
    path: '/write/new',
    HydrateFallback: () => null,
    lazy: async () => {
      const { NewStoryPage } = await import('@/features/writing/components/NewStoryPage');
      return { Component: NewStoryPage };
    },
  },
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
    { path: '/', element: <HomePage /> },
    // The Legal centre (S1-E14-01): /legal opens the terms; each document has its own address.
    { path: '/legal', element: <Navigate to="/legal/terms" replace /> },
    { path: '/legal/:documentSlug', element: <LegalCentrePage /> },
    // Sign-up (S1-E2-01): /join/<code> is an invite link (S1-E11-17); /auth/confirm is where the
    // confirmation and log-in emails land (supabase/templates/).
    { path: '/sign-up', element: <SignUpPage /> },
    { path: '/join/:code', element: <SignUpPage /> },
    { path: '/auth/confirm', element: <ConfirmEmailPage /> },
    // Log in and password reset (S1-E2-05): /reset-password is where the reset email lands.
    { path: '/sign-in', element: <SignInPage /> },
    { path: '/forgot-password', element: <ForgotPasswordPage /> },
    { path: '/reset-password', element: <ResetPasswordPage /> },
    // Once sign-up is public, a visitor from a closed market lands here (S1-E2-10).
    { path: '/not-open', element: <NotOpenPage /> },
    // Username and pen name (S1-E2-04): setup after the email is confirmed, and Settings.
    { path: '/setup', element: <SetupPage /> },
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
    ...(isDesignPageIncluded ? [designRoute] : []),
    // Any other address: "We can't find that page" in the reader's language (S1-E2-QA, board
    // 7.4). Its search button waits for Search (S1-E5-04).
    { path: '*', element: <NotFoundPage /> },
  ];
}
