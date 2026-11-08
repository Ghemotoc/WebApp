/**
 * HelpTopicTiles: the Help centre's sections as glass tiles, each with its help pages as links
 * (G5b; board Help, the grid of topics under "How can we help?").
 *
 * The board draws one tile per topic. Our topics are the sections staff give each help page in
 * the CMS, so a tile is a section heading with that section's pages under it; the pages keep their
 * order. Four tiles across on a wide screen, two on a tablet and one on a phone.
 * Who shows it: HelpCentrePage, with the pages its search left. What it calls: withBrand.
 */
import { Link } from 'react-router';

import type { HelpPageContent } from '@/schemas/websiteContent';

import type { ParsedEntry } from '../hooks/useWebsiteContent';
import { withBrand } from '../lib/brandText';

/**
 * Groups the pages by their section, keeping the sections in the order they first appear.
 *
 * @param pages - the live help pages
 * @returns [section, pages] pairs
 */
function pagesBySection(
  pages: ParsedEntry<HelpPageContent>[],
): [string, ParsedEntry<HelpPageContent>[]][] {
  const sections = new Map<string, ParsedEntry<HelpPageContent>[]>();
  for (const page of pages) {
    const section = page.content.section;
    sections.set(section, [...(sections.get(section) ?? []), page]);
  }
  return [...sections.entries()];
}

/**
 * Renders the tiles.
 *
 * @param props.pages - the help pages to show
 * @returns the grid, or nothing when there are no pages
 */
export function HelpTopicTiles({ pages }: { pages: ParsedEntry<HelpPageContent>[] }) {
  if (pages.length === 0) return null;
  return (
    <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
      {pagesBySection(pages).map(([section, sectionPages]) => (
        <li
          key={section}
          lang={sectionPages[0]?.languageCode}
          className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card"
        >
          <h2 className="m-0 font-heading text-[21px] font-bold text-heading">
            {withBrand(section)}
          </h2>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {sectionPages.map((page) => (
              <li key={page.entryKey}>
                <Link
                  to={`/help/${page.entryKey}`}
                  className="inline-flex min-h-6 items-center py-0.5 text-link underline"
                >
                  {withBrand(page.content.title)}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
