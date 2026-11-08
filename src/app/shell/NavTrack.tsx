/**
 * NavTrack: the website's main links in a recessed track, with the white water bubble under the
 * page on screen (bundle G4 SHELL; handoff "Navigation": "Website top bar: recessed track, water
 * bubble on the current page"; canvas Discover.web board).
 *
 * The links are ordinary links in a list, so a keyboard moves through them with Tab and a screen
 * reader hears "current page" on the one with aria-current. The bubble is measured from that link,
 * again whenever the track changes size (a longer translation, Messages appearing at sign-in), and
 * slides in 280 ms; reduce motion makes it jump (index.css). On a page outside the track, such as a
 * story, there is no bubble.
 * Who uses it: TopBar. What it calls: React Router's NavLink.
 */
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';

import type { NavigationItem } from '@/app/navigation';
import { navTrackLinkClasses } from '@/components/ui/navTrackStyles';

/** Where the bubble sits inside the track, in pixels. */
type BubbleBox = Pick<CSSProperties, 'left' | 'top' | 'width' | 'height'>;

/** What the track needs. */
export interface NavTrackProps {
  items: readonly NavigationItem[];
  /** Links that decide themselves whether to show, such as Messages while signed in. */
  end?: ReactNode;
}

/**
 * Measures the current page's link so the bubble can sit under it.
 *
 * @returns a ref for the track and the bubble's box (null when no link is current)
 */
function useCurrentLinkBox() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [box, setBox] = useState<BubbleBox | null>(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (track === null) return undefined;
    // Step 1: find the current link (NavLink marks it) and read its place in the track.
    const measure = () => {
      const current = track.querySelector<HTMLElement>('[aria-current="page"]');
      setBox(
        current === null
          ? null
          : {
              left: current.offsetLeft,
              top: current.offsetTop,
              width: current.offsetWidth,
              height: current.offsetHeight,
            },
      );
    };
    measure();
    // Step 2: measure again when the track changes size (browsers without ResizeObserver skip it).
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [pathname]);

  return { trackRef, box };
}

/**
 * Renders the track.
 *
 * @returns the list of links with the bubble
 */
export function NavTrack({ items, end }: NavTrackProps) {
  const { t } = useTranslation();
  const { trackRef, box } = useCurrentLinkBox();
  return (
    <ul
      ref={trackRef}
      className="segmented-track relative m-0 flex list-none flex-wrap items-center gap-0.5 rounded-full p-1"
    >
      {box !== null && (
        <li aria-hidden="true" className="segmented-bubble absolute rounded-full" style={box} />
      )}
      {items.map((item) => (
        <li key={item.href} className="flex">
          <NavLink to={item.href} end className={navTrackLinkClasses}>
            {t(item.labelKey)}
          </NavLink>
        </li>
      ))}
      {end}
    </ul>
  );
}
