/**
 * StoryListHeader: the top of a story list page: breadcrumb, title and one line naming the list
 * with "24 stories" (story S1-E5-09; board 3.10; user story 1.5, board A05-ReadList, which drops
 * the eyebrow above the title).
 *
 * Every list, a genre page included, has its breadcrumb and a large title on the page (board A06,
 * user story 1.6; until then a genre page always opened in a deep band of its colour). An admin
 * can still choose a band colour for a genre or a tag page in Staff › Website › Genre and tag
 * pages (bundle G12b; useListPageBackground); the breadcrumb, title and line then sit inside it
 * in white (the genre-band utility in index.css). The count is announced politely when a filter
 * changes it. On a genre or tag page the Follow button and the tag links follow (TopicFollowBar;
 * BOOKS-A06, BOOKS-A09). A sponsored category says "Sponsored by" under its heading (bundle SPONSORS-b3;
 * S1-E12-02 criterion 3), with or without a band.
 * Who uses it: StoryListPage. What it calls: useListPageBackground, TopicFollowBar and
 * SponsoredByLine.
 */
import { Link } from 'react-router';

import { SponsoredByLine } from '@/features/ads/components/SponsoredByLine';
import { cn } from '@/lib/utils';

import type { ListRequest } from '../api/storyLists';
import { useListPageBackground } from '../hooks/useListPageBackground';
import type { ListTitle } from '../hooks/useListTitle';
import { accentDeepBandClasses } from '../lib/categoryAccents';
import { TopicFollowBar } from './TopicFollowBar';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/** What the header needs. */
export interface StoryListHeaderProps {
  request: ListRequest;
  heading: ListTitle;
  /** How many stories the list holds, or null while it loads. */
  total: number | null;
}

/**
 * "Discover / Fiction": the way back, with the list's own name as the current step.
 *
 * @param props.title - the list's name
 * @returns the breadcrumb navigation
 */
function ListBreadcrumb({ title }: { title: string }) {
  const { t } = useDiscoveryTranslation();
  return (
    <nav aria-label={t('seeAll.breadcrumb')}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 type-body text-ink-muted">
        <li>
          <Link
            to="/discover"
            className="inline-flex min-h-6 items-center text-link underline underline-offset-2"
          >
            {t('seeAll.discover')}
          </Link>
        </li>
        {/* max-w-full and min-w-0 let one long word wrap inside a phone screen (GAPS-6 break test). */}
        <li className="flex max-w-full min-w-0 items-center gap-2">
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="min-w-0 break-words text-ink-heading">
            {title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

/**
 * The title and the line under it, the same inside the band and on the page (board A05: a
 * display title, then one muted line naming the list). The line is the list's description (its
 * old eyebrow), the count and "Ratings above your age never show", joined by middots; the count
 * is announced politely when a filter changes it.
 *
 * @param props.heading - the list's description and title
 * @param props.total - how many stories, or null while loading
 * @returns the heading block
 */
function ListHeading({ heading, total }: Pick<StoryListHeaderProps, 'heading' | 'total'>) {
  const { t } = useDiscoveryTranslation();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 type-title lg:type-display break-words text-ink-heading">
        {heading.title}
      </h1>
      <p className="m-0 type-body text-ink-muted">
        {heading.eyebrow}
        {' · '}
        <span aria-live="polite">{total === null ? '' : t('seeAll.count', { count: total })}</span>
        {total === null ? '' : ' · '}
        {t('seeAll.ratingShort')}
      </p>
    </div>
  );
}

/**
 * The Follow button and tag links, on a genre or tag page only (boards A06 and A09).
 *
 * @param props.request - the list
 * @param props.title - the page's title
 * @returns the bar, or null on any other list
 */
function TopicBar({ request, title }: { request: ListRequest; title: string }) {
  if (request.kind !== 'category' && request.kind !== 'tag') return null;
  return <TopicFollowBar topicKind={request.kind} topicKey={request.key ?? ''} title={title} />;
}

/**
 * Renders the header: the deep band on a category page, the plain heading on any other list.
 *
 * @returns the header
 */
export function StoryListHeader({ request, heading, total }: StoryListHeaderProps) {
  // Step 1: the band colour an admin chose for this genre or tag, if any (G12b).
  const chosenTone = useListPageBackground(request);
  // Step 2: with no chosen band, every list keeps the plain heading; a genre page too since
  // user story 1.6 (board A06 draws Fantasy on the page, not in a band).
  const isCategory = request.kind === 'category';
  if (chosenTone === null) {
    return (
      <header className="flex flex-col gap-3">
        <ListBreadcrumb title={heading.title} />
        <ListHeading heading={heading} total={total} />
        {isCategory && <SponsoredByLine kind="category" slug={request.key ?? ''} />}
        <TopicBar request={request} title={heading.title} />
      </header>
    );
  }
  // Step 3: the band, in the colour an admin chose (G12b).
  const listKey = request.key ?? '';
  const bandTone = chosenTone;
  return (
    <header
      className={cn(
        'genre-band relative flex flex-col gap-4 overflow-hidden rounded-card px-6 lg:px-12 py-6 lg:py-12 shadow-card',
        accentDeepBandClasses[bandTone],
      )}
      data-band-tone={bandTone}
    >
      {/* No soft light in the corner: the band is one flat colour (no gradients, 23 Nov 2026). */}
      <div className="relative flex flex-col gap-4">
        <ListBreadcrumb title={heading.title} />
        <ListHeading heading={heading} total={total} />
        {isCategory && <SponsoredByLine kind="category" slug={listKey} />}
        <TopicBar request={request} title={heading.title} />
      </div>
    </header>
  );
}
