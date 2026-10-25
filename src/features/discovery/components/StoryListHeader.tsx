/**
 * StoryListHeader: the top of a story list page: breadcrumb, eyebrow, title and "24 stories"
 * (story S1-E5-09; board 3.10).
 *
 * A category page gets a band in its category's colour behind the heading, as the board's
 * category pages do. The count is announced politely when a filter changes it.
 * Who uses it: StoryListPage.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { cn } from '@/lib/utils';

import type { ListRequest } from '../api/storyLists';
import type { ListTitle } from '../hooks/useListTitle';
import { accentBandClasses, categoryAccent } from '../lib/categoryAccents';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** What the header needs. */
export interface StoryListHeaderProps {
  request: ListRequest;
  heading: ListTitle;
  /** How many stories the list holds, or null while it loads. */
  total: number | null;
}

/**
 * Renders the header.
 *
 * @returns the breadcrumb and the heading block
 */
export function StoryListHeader({ request, heading, total }: StoryListHeaderProps) {
  const { t } = useDiscoveryTranslation();
  const isCategory = request.kind === 'category';
  return (
    <header className="flex flex-col gap-5">
      <nav aria-label={t('seeAll.breadcrumb')} className="text-sm text-meta">
        <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
          <li>
            <Link to="/discover" className="text-link underline-offset-2">
              {t('seeAll.discover')}
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-heading">
            {heading.title}
          </li>
        </ol>
      </nav>
      <div
        className={cn(
          'flex flex-col gap-2',
          isCategory && 'rounded-card border px-6 py-6',
          isCategory && accentBandClasses[categoryAccent(request.key ?? '')],
        )}
      >
        <Eyebrow>{heading.eyebrow}</Eyebrow>
        <h1 className="m-0 font-heading text-[clamp(32px,5vw,52px)] leading-[1.05] font-extrabold tracking-[-0.02em] text-heading">
          {heading.title}
        </h1>
        <p aria-live="polite" className="m-0 min-h-6 text-base text-body">
          {total === null ? '' : t('seeAll.count', { count: total })}
        </p>
      </div>
    </header>
  );
}
