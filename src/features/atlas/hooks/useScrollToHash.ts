/**
 * useScrollToHash: brings the item named after "#" in the address into view once the page's data
 * has arrived (story S1-E17-30: a search result "opens its item"; S1-E17-12: a mention opens
 * with one click; S1-E13-05: the "ready" notification opens Download my stories in Settings).
 *
 * The browser does this by itself only for what is on the page when it loads; these pages draw
 * their items after a database read, so this does it again once they are there. Other parts of
 * the page can still arrive later and push the item down (Settings loads each block on its own),
 * so for a short while the item is brought back into view whenever the page changes size, until
 * the person scrolls, types or touches the page themselves (ADMIN-2a2: the Download my stories
 * test caught a block above loading after the scroll).
 * Who calls it: IdeasPage, MarketingPage and DownloadMyStoriesBlock. What it calls: React
 * Router's useLocation and the browser's ResizeObserver.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** How long the item is kept in view while the rest of the page arrives. */
const settleMilliseconds = 3000;

/** What the person does that means they are moving around the page themselves. */
const ownMoves = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * Keeps one element in view while the page settles.
 *
 * @param item - the element named in the address
 * @returns a function that stops watching
 */
function keepInView(item: HTMLElement): () => void {
  // Step 1: bring it into view now.
  const bringIntoView = () => item.scrollIntoView({ block: 'center' });
  bringIntoView();
  // Step 2: each time the page changes size, bring it back (when the browser can watch sizes).
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(bringIntoView);
  observer?.observe(document.body);
  // Step 3: stop when the person moves themselves, or once the page has had time to settle.
  let timer = 0;
  const stop = () => {
    observer?.disconnect();
    for (const move of ownMoves) window.removeEventListener(move, stop);
    window.clearTimeout(timer);
  };
  for (const move of ownMoves) window.addEventListener(move, stop, { passive: true });
  timer = window.setTimeout(stop, settleMilliseconds);
  return stop;
}

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
    if (item === null) return;
    return keepInView(item);
  }, [isReady, hash]);
}
