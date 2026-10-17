/**
 * The list of pages and their addresses (stories S1-E1-01 and S1-E1-03).
 *
 * Who uses it: src/main.tsx hands `appRoutes` to React Router's RouterProvider.
 * What it shows: every public page sits inside AppLayout (top bar, page, footer); each route
 * points to one page component inside src/features/<feature>/.
 * Every new screen adds its route here, and a line to docs/code-tour.md.
 */
import { Navigate, type RouteObject } from 'react-router';

import { HomePage } from '@/features/home/components/HomePage';
import { LegalCentrePage } from '@/features/legal/components/LegalCentrePage';

import { AppLayout } from './shell/AppLayout';

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
 * Every route in the app, in one list so a reader can see the whole map at a glance.
 * Exported separately from the router so tests can render a route in memory.
 */
export const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      // The Legal centre (S1-E14-01): /legal opens the terms; each document has its own address.
      { path: '/legal', element: <Navigate to="/legal/terms" replace /> },
      { path: '/legal/:documentSlug', element: <LegalCentrePage /> },
      ...(isDesignPageIncluded ? [designRoute] : []),
      // Any other address goes back home for now, so nobody sees React Router's built-in English
      // error page. S1-E1-05 replaces this with a proper 404 page in both languages.
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
