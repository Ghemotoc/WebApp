/**
 * StoryListHeader: the top of a story list page: breadcrumb, eyebrow, title and "24 stories"
 * (story S1-E5-09; board 3.10; liquid glass look from bundle G7c, boards DiscoverGenre,
 * DiscoverTag and DiscoverAll).
 *
 * A category page opens with a deep band in its category's colour (categoryAccents.ts) with a
 * soft light glow in the top right; the breadcrumb, eyebrow, title and count sit inside it in
 * white (the genre-band utility in index.css). An admin can choose another band colour for a
 * genre, and a band for a tag page, in Staff › Website › Genre and tag pages (bundle G12b;
 * useListPageBackground). Every other list (a tag with no band, Trending, a writer's stories, a
 * search) has no band: the breadcrumb, eyebrow and a large title sit on the page, as the
 * DiscoverTag and DiscoverAll boards draw them. The count is announced politely when a
 * filter changes it. A sponsored category says "Sponsored by" under its heading (bundle
 * SPONSORS-b3; S1-E12-02 criterion 3); the list itself is the same with or without a sponsor.
 * Who uses it: StoryListPage. What it calls: useListPageBackground and SponsoredByLine.
 */
import { Link } from 'react-router';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { SponsoredByLine } from '@/features/ads/components/SponsoredByLine';
import { cn } from '@/lib/utils';

import type { ListRequest } from '../api/storyLists';
import { useListPageBackground } from '../hooks/useListPageBackground';
import type { ListTitle } from '../hooks/useListTitle';
import { accentDeepBandClasses, categoryAccent } from '../lib/categoryAccents';
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
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-sm text-body">
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
          <span aria-current="page" className="min-w-0 break-words text-heading">
            {title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

/**
 * The eyebrow, the title and the count, the same inside the band and on the page.
 *
 * @param props.heading - the list's eyebrow and title
 * @param props.total - how many stories, or null while loading
 * @returns the heading block
 */
function ListHeading({ heading, total }: Pick<StoryListHeaderProps, 'heading' | 'total'>) {
  const { t } = useDiscoveryTranslation();
  return (
    <div className="flex flex-col gap-3">
      <Eyebrow>{heading.eyebrow}</Eyebrow>
      <h1 className="m-0 font-heading text-[clamp(40px,5.6vw,72px)] leading-[0.98] font-bold tracking-[-0.03em] break-words text-heading">
        {heading.title}
      </h1>
      <p aria-live="polite" className="m-0 min-h-6 text-[17px] text-body">
        {total === null ? '' : t('seeAll.count', { count: total })}
      </p>
    </div>
  );
}

/**
 * Renders the header: the deep band on a category page, the plain heading on any other list.
 *
 * @returns the header
 */
export function StoryListHeader({ request, heading, total }: StoryListHeaderProps) {
  // Step 1: the band colour an admin chose for this genre or tag, if any (G12b).
  const chosenTone = useListPageBackground(request);
  // Step 2: a tag page with no chosen band, and every other list, keep the plain heading.
  const isCategory = request.kind === 'category';
  if (!isCategory && chosenTone === null) {
    return (
      <header className="flex flex-col gap-4">
        <ListBreadcrumb title={heading.title} />
        <ListHeading heading={heading} total={total} />
      </header>
    );
  }
  // Step 3: the band, in the chosen colour or the genre's own accent.
  const listKey = request.key ?? '';
  const bandTone = chosenTone ?? categoryAccent(listKey);
  return (
    <header
      className={cn(
        'genre-band relative flex flex-col gap-5 overflow-hidden rounded-[40px] px-[clamp(24px,4vw,48px)] py-[clamp(28px,4vw,48px)] shadow-card',
        accentDeepBandClasses[bandTone],
      )}
      data-band-tone={bandTone}
    >
      {/* The soft light in the top right corner (board DiscoverGenre); decoration only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_70%_at_85%_20%,rgb(255_255_255/0.22),transparent_70%)]"
      />
      <div className="relative flex flex-col gap-4">
        <ListBreadcrumb title={heading.title} />
        <ListHeading heading={heading} total={total} />
        {isCategory && <SponsoredByLine kind="category" slug={listKey} />}
      </div>
    </header>
  );
}
