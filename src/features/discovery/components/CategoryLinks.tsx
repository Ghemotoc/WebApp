/**
 * CategoryLinks: "Browse by category", a row of links to each category page (story S1-E5-01).
 *
 * They look like the board's category chips (white, #8E7B99 border, 36 px tall with a 44 px
 * touch target, a dot in the category's accent colour) but they are links, because each one opens
 * a page; a chip that switches something is a button (DoD pill system).
 * Who uses it: DiscoverPage. What it calls: useStoryFormOptions → the categories table (public).
 */
import { Link } from 'react-router';

import { useStoryFormOptions } from '@/features/writing/hooks/useStoryFormOptions';
import { cn } from '@/lib/utils';

import { accentDotClasses, categoryAccent } from '../lib/categoryAccents';
import { listAddress, plainList } from '../lib/listAddresses';
import { useDiscoveryTranslation } from '../registerDiscoveryTranslations';

/**
 * Renders the row, or nothing until the categories have loaded.
 *
 * @returns the navigation
 */
export function CategoryLinks() {
  const { t } = useDiscoveryTranslation();
  const { categories } = useStoryFormOptions();
  if (categories.length === 0) return null;
  return (
    <nav aria-label={t('discover.categoriesLabel')}>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              to={listAddress(plainList('category', category.slug))}
              className="relative inline-flex h-9 items-center gap-2 rounded-full border border-control-border bg-surface px-3.5 text-sm leading-none font-semibold text-heading no-underline after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-[''] hover:bg-tint"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'h-2 w-2 rounded-full',
                  accentDotClasses[categoryAccent(category.slug)],
                )}
              />
              {t(`categories.${category.slug}`, { ns: 'writing' })}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
