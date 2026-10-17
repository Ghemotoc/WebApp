/**
 * The list of pages and their addresses (story S1-E1-01).
 *
 * Who uses it: src/main.tsx hands `appRoutes` to React Router's RouterProvider.
 * What it shows: each route points to one page component inside src/features/<feature>/.
 * Every new screen adds its route here, and a line to docs/code-tour.md.
 */
import { Navigate, type RouteObject } from 'react-router';

import { HomePage } from '@/features/home/components/HomePage';

/**
 * Every route in the app, in one list so a reader can see the whole map at a glance.
 * Exported separately from the router so tests can render a route in memory.
 */
export const appRoutes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  // Any other address goes back home for now, so nobody sees React Router's built-in English error
  // page. S1-E1-05 replaces this with a proper 404 page in both languages.
  { path: '*', element: <Navigate to="/" replace /> },
];
