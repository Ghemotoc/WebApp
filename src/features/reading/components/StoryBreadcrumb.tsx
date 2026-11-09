/**
 * StoryBreadcrumb: "Discover / Fiction / The Salt Mine Choir" above the story page (bundle G7;
 * liquid glass board StoryPage).
 *
 * The middle step opens the story's category page, so the category pages stay one click away now
 * that Discover has no category chips (design rulebook, "Discover": no genre bar there). The last
 * step is the story itself, marked aria-current and not a link.
 * Who shows it: StoryPage. What it calls: listAddress (the category page's address).
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { listAddress, plainList } from '@/features/discovery/lib/listAddresses';

/** A linked step: underlined, at least 24 px tall (CLAUDE.md rule 9). */
const stepLink = 'inline-flex min-h-6 items-center text-link underline underline-offset-2';

/** What the breadcrumb needs from the story. */
export interface StoryBreadcrumbProps {
  title: string;
  categorySlug: string;
}

/**
 * Renders the breadcrumb.
 *
 * @param props.title - the story's title, the current step
 * @param props.categorySlug - the story's category, the linked middle step
 * @returns the breadcrumb navigation
 */
export function StoryBreadcrumb({ title, categorySlug }: StoryBreadcrumbProps) {
  const { t } = useTranslation('reading');
  // The category's name in the reader's language, from the writing namespace's category names.
  const categoryName = t(`categories.${categorySlug}`, {
    ns: 'writing',
    defaultValue: categorySlug,
  });
  return (
    <nav aria-label={t('storyPage.breadcrumb')}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0 text-sm text-body">
        <li>
          <Link to="/discover" className={stepLink}>
            {t('storyPage.breadcrumbDiscover')}
          </Link>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true">/</span>
          <Link to={listAddress(plainList('category', categorySlug))} className={stepLink}>
            {categoryName}
          </Link>
        </li>
        <li className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="break-words">
            {title}
          </span>
        </li>
      </ol>
    </nav>
  );
}
