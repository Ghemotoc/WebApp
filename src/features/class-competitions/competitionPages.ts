/**
 * competitionPages: the three class competition pages behind one door (bundle CLASS-POINTS,
 * part 2). The router loads this one file for all three routes, so they share one download and
 * add one entry, not three, to the first download's list of chunks (the reader's script budget,
 * e2e/reader-performance.spec.ts).
 *
 * Who calls it: src/app/router.tsx. What it calls: the three page components.
 */
export { CompetitionFormPage } from './components/CompetitionFormPage';
export { CompetitionResultsPage } from './components/CompetitionResultsPage';
export { CriteriaTemplatesPage } from './components/CriteriaTemplatesPage';
