/**
 * ResourcesLinkList: a glass card of link rows, each a bold title, an optional short line and a
 * chevron, with a fine line between rows (bundle G9 WRITING, part a; board PhoneAppResources; the
 * same look as the Help centre's "Still stuck?" and the DoD rule on lines between rows).
 * Who shows it: ResourcesPage, for the guides and for "More help". What it calls: Link.
 */
import { Link } from 'react-router';

import { ChevronRightIcon } from '@/components/icons/ChevronRightIcon';

/** One row. */
export interface ResourcesLink {
  href: string;
  title: string;
  line?: string;
  /** The language of the row's words, when they come from the CMS. */
  lang?: string;
}

/**
 * Renders the card.
 *
 * @param props.links - the rows, in order
 * @returns the list
 */
export function ResourcesLinkList({ links }: { links: ResourcesLink[] }) {
  return (
    <ul className="m-0 flex list-none flex-col overflow-hidden rounded-card border border-border bg-surface p-0 shadow-card">
      {links.map((link) => (
        <li key={link.href} lang={link.lang} className="border-b border-hairline last:border-b-0">
          <Link
            to={link.href}
            className="flex min-h-14 items-center gap-4 px-5 py-3.5 text-ink no-underline hover:bg-tint"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-semibold text-heading">{link.title}</span>
              {link.line !== undefined && <span className="text-sm text-meta">{link.line}</span>}
            </span>
            <ChevronRightIcon className="shrink-0 text-meta" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
