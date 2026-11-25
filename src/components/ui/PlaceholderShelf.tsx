/**
 * PlaceholderShelf: a row of grey cover shapes under the row's own heading, shown while the row's
 * stories load (design books item 15, "Loading that looks like the page").
 *
 * It shows nothing for the first 300 ms (most reads answer sooner), then the heading and as many
 * grey 2:3 shapes as the real row shows, in the same grid (shelfRowStyles), so nothing jumps when
 * the covers arrive. The shapes are hidden from screen readers; one short "Loading…" line says it
 * instead, inside an aria-busy section. Never a whole-page spinner.
 * Who uses it: DiscoverShelf (Home and Discover rows) and LibraryShelves.
 * What it calls: useShowAfter, Eyebrow, ShelfToolbar and shelfRowStyles.
 */
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useShowAfter } from '@/lib/loading/useShowAfter';

import { Eyebrow } from './Eyebrow';
import { perPageClasses, rowGridClasses } from './shelfRowStyles';
import { ShelfToolbar, type ShelfToolbarPlacement } from './ShelfToolbar';

/** Enough shapes to fill the widest row (5 covers) with the edge of a sixth. */
const SHAPE_COUNT = 6;

/** What the placeholder needs. */
export interface PlaceholderShelfProps {
  /** The row's heading, shown as it will be, or left out when the caller draws its own. */
  title?: string;
  eyebrow?: string;
  /** Anything the caller keeps above the row while it loads, such as the Library's tabs. */
  toolbar?: ReactNode;
  /**
   * Where the toolbar sits: above the row (the default) or under it, as the Home page's genre
   * chips do on board A01 (Robert's review of 25 Nov 2026).
   */
  toolbarPlacement?: ShelfToolbarPlacement;
  coversInColumn?: 3 | 4;
}

/**
 * Renders the waiting row after 300 ms, or nothing before then.
 *
 * @returns the heading and the grey shapes, or null
 */
export function PlaceholderShelf({
  title,
  eyebrow,
  toolbar,
  toolbarPlacement = 'above',
  coversInColumn,
}: PlaceholderShelfProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const isShown = useShowAfter();
  if (!isShown) return null;
  return (
    <section
      aria-busy="true"
      aria-labelledby={title === undefined ? undefined : headingId}
      className="flex flex-col"
    >
      {title !== undefined && (
        <div className="mb-4 min-w-0">
          {eyebrow !== undefined && <Eyebrow>{eyebrow}</Eyebrow>}
          <h2 id={headingId} className="m-0 type-heading">
            {title}
          </h2>
        </div>
      )}
      <ShelfToolbar toolbar={toolbar} placement={toolbarPlacement} spot="above" />
      <p className="sr-only">{t('loading.shelf')}</p>
      {/* The shapes take the real row's places; overflow hides the sixth's far edge. */}
      <div aria-hidden="true" className="overflow-hidden">
        <ul className={`${perPageClasses[coversInColumn ?? 'full']} ${rowGridClasses}`}>
          {Array.from({ length: SHAPE_COUNT }, (_, index) => (
            <li key={index} className="flex min-w-0 flex-col gap-2">
              <div className="aspect-[2/3] w-full rounded-cover bg-hairline motion-safe:animate-pulse" />
              <div className="h-4 w-3/4 rounded-full bg-hairline motion-safe:animate-pulse" />
            </li>
          ))}
        </ul>
      </div>
      <ShelfToolbar toolbar={toolbar} placement={toolbarPlacement} spot="below" />
    </section>
  );
}
