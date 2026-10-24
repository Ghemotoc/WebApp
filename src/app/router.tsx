/**
 * The list of pages and their addresses (stories S1-E1-01 and S1-E1-03).
 *
 * Who uses it: src/main.tsx hands `appRoutes` to React Router's RouterProvider.
 * What it shows: every public page sits inside AppLayout (top bar, page, footer); each route
 * points to one page component inside src/features/<feature>/.
 * Every new screen adds its route here, and a line to docs/code-tour.md.
 */
import { Navigate, type RouteObject } from 'react-router';

import { SettingsPage } from '@/features/account/components/SettingsPage';
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
 * The /staff/roles route (S1-E2-07a), loaded only when someone opens it, so staff code never ships
 * in the reader's bundle (architecture 1.8.1). S1-E11-01 moves it into the admin shell.
 */
const staffRolesRoute: RouteObject = {
  path: '/staff/roles',
  HydrateFallback: () => null,
  lazy: async () => {
    const { StaffRolesPage } = await import('@/features/staff/components/StaffRolesPage');
    return { Component: StaffRolesPage };
  },
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
    { path: '/settings', element: <SettingsPage /> },
    staffRolesRoute,
    // Lane A: writing and reading (S1-E3, S1-E4).
    ...writeRoutes,
    ...(isDesignPageIncluded ? [designRoute] : []),
    // Any other address: "We can't find that page" in the reader's language (S1-E2-QA, board
    // 7.4). Its search button waits for Search (S1-E5-04).
    { path: '*', element: <NotFoundPage /> },
  ];
}
