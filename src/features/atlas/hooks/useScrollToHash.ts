/**
 * useScrollToHash: brings the item named after "#" in the address into view once the page's data
 * has arrived (story S1-E17-30: a search result "opens its item"; S1-E17-12: a mention opens
 * with one click).
 *
 * The browser does this by itself only for what is on the page when it loads; Story Atlas pages
 * draw their items after a database read, so this does it again once they are there.
 * Who calls it: IdeasPage and MarketingPage. What it calls: React Router's useLocation.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router';

/**
 * Scrolls to the item once it exists.
 *
 * @param isReady - true once the page has drawn its items
 */
export function useScrollToHash(isReady: boolean): void {
  const { hash } = useLocation();
  useEffect(() => {
    // Nothing to do before the items are drawn, or when the address names none.
    if (!isReady || hash.length < 2) return;
    const item = document.getElementById(decodeURIComponent(hash.slice(1)));
    item?.scrollIntoView({ block: 'center' });
  }, [isReady, hash]);
}
