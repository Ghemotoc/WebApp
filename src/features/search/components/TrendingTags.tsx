/**
 * TrendingTags: "Trending tags" on the Search page before a search (user story 1.7, board
 * A07-Search): the tags most read this week, each a link to its tag page ("#found-family").
 *
 * Shown under Recent searches. A week with no reads, or a failed read, shows nothing: the page
 * still works without it, and the other parts say what to do.
 * Who shows it: SearchPage. What it calls: useTrendingTags() and useTagCatalogue() (each tag in
 * the interface language; the link keeps the stored name, which the tag page finds in any
 * language, CMS-1e).
 */
import { Link } from 'react-router';

import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';
import { useTagCatalogue } from '@/features/tags/hooks/useTagCatalogue';

import { useTrendingTags } from '../hooks/useTrendingTags';
import { useSearchTranslation } from '../registerSearchTranslations';

/**
 * Renders the heading and the tag links, or nothing when no tag trends.
 *
 * @returns the section, or null
 */
export function TrendingTags() {
  const { t } = useSearchTranslation();
  const { showTag } = useTagCatalogue();
  const tags = useTrendingTags().data ?? [];
  if (tags.length === 0) return null;
  return (
    <section aria-labelledby="trending-tags-heading" className="flex flex-col gap-3">
      <h2 id="trending-tags-heading" className="m-0 type-subheading text-ink-heading">
        {t('trending.heading')}
      </h2>
      <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
        {tags.map((tag) => (
          <li key={tag}>
            {/* The 24 px minimum target (rule 9) comes from the line box; hit-target widens the
                tap to 44 by 32 (design books, item 10), as the story page's tags. */}
            <Link
              to={listAddress(plainList('tag', tag))}
              className="hit-target inline-flex min-h-6 items-center type-body font-semibold text-ink underline underline-offset-2"
            >
              {t('trending.tag', { tag: showTag(tag) })}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
