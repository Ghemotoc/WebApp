/**
 * pageHeaderContext: lets a page draw its own bar in place of the shell's narrow-screen header
 * (bundle CALM-5; design handover Step 2, "The chapter bar": "Phones: the chapter bar is the only
 * bar while reading").
 *
 * Below 1024 px the shell draws header A (FocusHeader: Back and a title) on reading screens. The
 * reader's chapter bar already holds Back, the story's title and Aa, so while it is on screen the
 * shell leaves its own header out and the paper fills the screen under one glass bar. Pages that
 * show no chapter bar at the same address (the teaser for visitors, "not available") keep header
 * A, because they never ask. From 1024 px the website's top bar always stays.
 * Who uses it: AppLayout (provides the setter and reads the answer) and usePageOwnsNarrowHeader
 * (pages that draw their own bar). What it calls: React context only.
 */
import { createContext, useContext, useLayoutEffect } from 'react';

/** Tells the shell whether the page on screen draws its own narrow-screen bar. */
export const PageHeaderContext = createContext<(isOwned: boolean) => void>(() => undefined);

/**
 * Says, for as long as the calling component is on screen, that the page draws its own bar, so
 * the shell's narrow-screen header steps aside. A layout effect, so the shell's header is gone
 * before the browser paints the bar under it.
 */
export function usePageOwnsNarrowHeader(): void {
  const setIsOwned = useContext(PageHeaderContext);
  useLayoutEffect(() => {
    setIsOwned(true);
    return () => setIsOwned(false);
  }, [setIsOwned]);
}
