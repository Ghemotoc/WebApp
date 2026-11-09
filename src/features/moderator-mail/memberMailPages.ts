/**
 * memberMailPages: the three member pages of moderator mail, gathered so the router loads them as
 * one piece (story S1-E10-11; bundle G8c).
 *
 * Why: each lazily loaded page that shares small parts (the back link, the status pill, the
 * icons) makes the build split those parts into their own files, and every extra file adds to
 * the list the first download carries, which the chapter reader's script budget counts
 * (e2e/reader-performance.spec.ts). Loading the list, one thread and "Write to the moderators"
 * together keeps those parts inside one file; the three pages are small.
 * Who uses it: the moderator mail routes in src/app/router.tsx.
 */
export { MailThreadPage } from './components/MailThreadPage';
export { MyMailPage } from './components/MyMailPage';
export { NewMailPage } from './components/NewMailPage';
