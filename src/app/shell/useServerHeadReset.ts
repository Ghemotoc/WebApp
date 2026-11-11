/**
 * useServerHeadReset: puts the page's <title> back to the site's name once the visitor moves on
 * from the page the server wrote it for (story S1-E11-37; bundle SEO-1b).
 *
 * Why it exists: for the home page and help pages the server writes the page's own title into
 * index.html (server/website-head.ts), marked data-page-head, with the site's name kept in
 * data-site-name. The app is one page, so that <title> would otherwise stay in <head> on every
 * screen the visitor opens next; a screen without a title of its own would then show the home
 * page's. Screens that render their own <title> are not affected (React puts theirs first).
 * Who calls it: AppLayout, once. What it calls: nothing but the document.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * Watches the address; on the first move away from the page the visitor arrived on, the server's
 * <title> goes back to the site's name and loses its mark.
 */
export function useServerHeadReset(): void {
  const { pathname } = useLocation();
  const firstPathname = useRef(pathname);
  useEffect(() => {
    // Step 1: still on the page the server wrote the title for: leave it.
    if (pathname === firstPathname.current) return;
    // Step 2: the server's title, when there is one, goes back to the site's name.
    const serverTitle = document.head.querySelector<HTMLTitleElement>('title[data-page-head]');
    if (serverTitle === null) return;
    serverTitle.textContent = serverTitle.dataset.siteName ?? '';
    delete serverTitle.dataset.pageHead;
  }, [pathname]);
}
