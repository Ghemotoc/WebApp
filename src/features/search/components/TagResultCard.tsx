/**
 * TagResultCard: one tag a search found, in the reader's language, with how many stories they may
 * see, as one link to the tag's page (story S1-E5-04).
 *
 * Who uses it: SearchResults (a shelf) and SearchGroupPage (a grid). What it calls:
 * useTagCatalogue() for the name in the interface language; the link keeps the stored name, which
 * the tag page finds in any language (CMS-1e).
 */
import { Link } from 'react-router';

import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';
import { useTagCatalogue } from '@/features/tags/hooks/useTagCatalogue';

import type { FoundTag } from '../api/search';
import { useSearchTranslation } from '../registerSearchTranslations';

/**
 * Renders the card.
 *
 * @param props.tag - the tag
 * @param props.isFluid - fill the grid column instead of the shelf's 200 px
 * @returns the card
 */
export function TagResultCard({ tag, isFluid = false }: { tag: FoundTag; isFluid?: boolean }) {
  const { t } = useSearchTranslation();
  const { showTag } = useTagCatalogue();
  return (
    <Link
      to={listAddress(plainList('tag', tag.name))}
      className={`flex h-full flex-col gap-1 rounded-card border border-border bg-surface p-5 no-underline shadow-card hover:bg-tint ${isFluid ? 'w-full' : 'w-[200px]'}`}
    >
      <span className="font-heading text-lg leading-tight font-bold break-words text-heading">
        {showTag(tag.name)}
      </span>
      <span className="text-sm text-meta">{t('results.stories', { count: tag.storyCount })}</span>
    </Link>
  );
}
