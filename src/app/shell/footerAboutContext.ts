/**
 * footerAboutContext: lets a story's pages put the story statement in the footer's first place
 * instead of the site's own words (CALM-9s; Robert's canvas comments of 23 Nov 2026, B01 to B06).
 *
 * Who uses it: AppLayout (provides the setter and draws StoryFooterAbout in the Footer) and
 * useStoryStatement (the story page and the reader). What it calls: React context only.
 */
import { createContext, useContext, useEffect } from 'react';

import type { StoryStatement } from '@/features/reading/api/storyStatement';

/** Tells the shell which story statement the footer shows, or null for the site's own words. */
export const FooterAboutContext = createContext<(statement: StoryStatement | null) => void>(
  () => undefined,
);

/**
 * Shows a statement in the footer for as long as the calling page is on screen.
 *
 * @param statement - the statement, or null while it loads or when there is none
 */
export function useShowInFooter(statement: StoryStatement | null): void {
  const setStatement = useContext(FooterAboutContext);
  useEffect(() => {
    setStatement(statement);
    // Leaving the page puts the site's own words back.
    return () => setStatement(null);
  }, [setStatement, statement]);
}
