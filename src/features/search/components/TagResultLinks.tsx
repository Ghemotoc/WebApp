/**
 * TagResultLinks: the tags a search found as wrapped text links ("#mystery"), on phones (bundle
 * CALM-7c; board simplified/New-PhoneSearch, "Popular tags"). Each link is at least 44 px tall and
 * opens the tag's page; the tag shows in the interface language and the link keeps the stored
 * name, which the tag page finds in any language (CMS-1e).
 * Who uses it: SearchGroupRows. What it calls: useTagCatalogue().
 */
import { Link } from 'react-router';

import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';
import { useTagCatalogue } from '@/features/tags/hooks/useTagCatalogue';

import type { FoundTag } from '../api/search';
import { useSearchTranslation } from '../registerSearchTranslations';

/**
 * Renders the links.
 *
 * @param props.tags - the tags found
 * @param props.headingId - the id of the heading that names the list
 * @returns the list of links
 */
export function TagResultLinks({ tags, headingId }: { tags: FoundTag[]; headingId: string }) {
  const { t } = useSearchTranslation();
  const { showTag } = useTagCatalogue();
  return (
    <ul aria-labelledby={headingId} className="m-0 flex list-none flex-wrap gap-x-4 p-0">
      {tags.map((tag) => (
        <li key={tag.name}>
          <Link
            to={listAddress(plainList('tag', tag.name))}
            className="inline-flex min-h-11 items-center type-body font-semibold text-link underline"
          >
            {t('results.tagLink', { tag: showTag(tag.name) })}
          </Link>
        </li>
      ))}
    </ul>
  );
}
